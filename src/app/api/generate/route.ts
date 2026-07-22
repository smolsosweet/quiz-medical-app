import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import crypto from "crypto";

export const maxDuration = 60; // Tăng giới hạn thời gian chờ của Vercel (Hobby tier tối đa là 60s)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const numQuestionsStr = formData.get("numQuestions") as string | null;
    const scope = formData.get("scope") as string | null;
    const previousQuestionsText = formData.get("previousQuestionsText") as string | null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!files || files.length === 0 || !numQuestionsStr) {
      return NextResponse.json({ error: "Thiếu dữ liệu đầu vào." }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({ error: "Lỗi cấu hình Server: Thiếu API Key." }, { status: 500 });
    }

    const numQuestions = parseInt(numQuestionsStr, 10);
    const ai = new GoogleGenAI({ apiKey });

    let documentText = "";
    const fileParts: { inlineData: { data: string; mimeType: string } }[] = [];

    // Xử lý từng file
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        // Gửi thẳng file PDF và Ảnh cho Gemini dưới dạng Base64
        fileParts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: file.type
          }
        });
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer });
        documentText += `\n--- Tài liệu: ${file.name} ---\n${result.value}\n`;
      } else {
        documentText += `\n--- Tài liệu: ${file.name} ---\n(Chưa hỗ trợ định dạng này)\n`;
      }
    }

    const scopeInstruction = scope 
      ? `\nCHÚ Ý ĐẶC BIỆT: Người dùng yêu cầu bạn CHỈ TẬP TRUNG tạo câu hỏi từ các phần nội dung sau của tài liệu: "${scope}". Hãy BỎ QUA các phần không liên quan đến yêu cầu này.\n` 
      : "";

    const prevInstruction = previousQuestionsText
      ? `\nCÁC CÂU HỎI ĐÃ TẠO TRƯỚC ĐÓ (BẮT BUỘC KHÔNG ĐƯỢC TẠO TRÙNG LẶP NỘI DUNG):\n${previousQuestionsText}\n`
      : "";

    const prompt = `
Bạn là một bác sĩ chuyên khoa tuyến đầu, một giáo sư đại học y khoa xuất sắc và một chuyên gia phỏng vấn sinh viên y khoa lão luyện.
Nhiệm vụ của bạn là đọc kỹ tài liệu y học sau đây và tạo ra ĐÚNG ${numQuestions} câu hỏi trắc nghiệm y khoa. KHÔNG ĐƯỢC THIẾU, KHÔNG ĐƯỢC THỪA.
LƯU Ý ĐẶC BIỆT: Bạn BẮT BUỘC phải quét và bao quát TOÀN BỘ nội dung tài liệu từ trang đầu đến trang cuối. Các câu hỏi phải được rải đều khắp các phần, tuyệt đối không được bám víu vào một đoạn văn bản duy nhất.${scopeInstruction}${prevInstruction}

YÊU CẦU VỀ ĐỘ KHÓ VÀ CHẤT LƯỢNG CÂU HỎI Y KHOA:
1. Đa dạng hóa độ khó: Các câu hỏi phải được thiết kế với độ khó tăng dần, bao gồm:
   - Dễ (Nhận biết): Kiểm tra trí nhớ, các khái niệm, định nghĩa, triệu chứng cơ bản.
   - Trung bình (Đọc hiểu & Phân tích): Yêu cầu liên kết nhiều dữ kiện lâm sàng/cận lâm sàng trong tài liệu để tìm ra chẩn đoán hoặc hướng giải quyết.
   - Khó (Vận dụng cao): Đặt ra các tình huống lâm sàng (Clinical Case Study) thực tiễn, hoặc câu hỏi hóc búa mang tầm cỡ phỏng vấn nội trú/thi chuyển giai đoạn, buộc sinh viên y khoa phải suy luận logic dựa trên các nguyên lý sinh lý, bệnh lý có trong tài liệu.
2. Thiết kế đáp án nhiễu: Các đáp án sai (A, B, C, D) phải cực kỳ hợp lý, có tính đánh lừa cao chứ không được ngớ ngẩn hay quá dễ loại trừ.

YÊU CẦU BẮT BUỘC (GROUNDING RULES):
1. Tính chính xác tuyệt đối: ĐÁP ÁN ĐÚNG CHỈ được rút ra từ thông tin CÓ TRONG TÀI LIỆU được cung cấp. Tuyệt đối KHÔNG sử dụng kiến thức bên ngoài, KHÔNG tự bịa đặt thông tin. Tuy nhiên, bạn được phép tạo ra bối cảnh/tình huống giả định để thử thách khả năng vận dụng của người học.
2. Ngôn ngữ: Tất cả câu hỏi và đáp án PHẢI BẰNG TIẾNG VIỆT, bất kể tài liệu gốc là ngôn ngữ gì.
3. Cấu trúc: Mỗi câu hỏi phải có 4 đáp án (A, B, C, D) và chỉ có duy nhất 1 đáp án đúng.
4. Lời giải thích chất lượng cao: TUYỆT ĐỐI KHÔNG viết hời hợt kiểu "Đáp án A đúng vì tài liệu nói thế". Bạn BẮT BUỘC phải đóng vai một người thầy, giải thích cặn kẽ tại sao đáp án đó đúng, tại sao các đáp án kia sai, dựa trên các quy luật/nguyên lý trong tài liệu. Lời giải thích càng sâu sắc càng tốt.

Bạn PHẢI trả về dữ liệu dưới dạng JSON (không kèm markdown \`\`\`json) với cấu trúc sau:
{
  "questions": [
    {
      "text": "Nội dung câu hỏi",
      "options": [
        { "label": "A", "text": "Đáp án A" },
        { "label": "B", "text": "Đáp án B" },
        { "label": "C", "text": "Đáp án C" },
        { "label": "D", "text": "Đáp án D" }
      ],
      "correctAnswer": "A", // Chỉ một chữ cái A, B, C hoặc D
      "explanation": "Giải thích ngắn gọn dựa trên tài liệu"
    }
  ]
}
`;

    const parts: any[] = [{ text: prompt }];
    
    if (documentText.trim()) {
      parts.push({ text: "\n\n--- NỘI DUNG TÀI LIỆU ---\n\n" + documentText });
    }
    
    if (fileParts.length > 0) {
      parts.push(...fileParts);
    }

    const modelName = formData.get("model") as string || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });
    
    let responseText = response.text || "";

    // Parse JSON một cách an toàn nhất (tìm ngoặc nhọn đầu/cuối)
    let parsedData;
    try {
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = responseText.substring(firstBrace, lastBrace + 1);
        parsedData = JSON.parse(jsonStr);
      } else {
        throw new Error("Không tìm thấy dữ liệu JSON trong phản hồi.");
      }
    } catch (parseError) {
      console.error("Lỗi parse JSON:", responseText);
      return NextResponse.json({ error: "AI không trả về đúng định dạng JSON hoặc dữ liệu quá dài bị cắt đứt." }, { status: 500 });
    }

    // Thêm ID cho mỗi câu hỏi
    if (parsedData && Array.isArray(parsedData.questions)) {
      // Ép chặt số lượng câu hỏi đúng với yêu cầu của người dùng
      if (parsedData.questions.length > numQuestions) {
        parsedData.questions = parsedData.questions.slice(0, numQuestions);
      }

      parsedData.questions = parsedData.questions.map((q: any) => ({
        ...q,
        id: crypto.randomUUID()
      }));
      return NextResponse.json(parsedData);
    } else {
      return NextResponse.json({ error: "Dữ liệu trả về không hợp lệ." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Lỗi xử lý API:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}
