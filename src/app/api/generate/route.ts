import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import crypto from "crypto";

export const maxDuration = 60; // Tăng giới hạn thời gian chờ của Vercel (Hobby tier tối đa là 60s)

const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

const MAX_FILE_SIZE_MB = 10;
const MAX_TOTAL_FILES = 5;

// Định nghĩa kiểu dữ liệu an toàn cho Part của Gemini
type Part = { text: string } | { inlineData: { data: string; mimeType: string } };

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

    if (files.length > MAX_TOTAL_FILES) {
      return NextResponse.json({ error: `Quá số lượng file cho phép (tối đa ${MAX_TOTAL_FILES}).` }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({ error: "Lỗi cấu hình Server: Thiếu API Key." }, { status: 500 });
    }

    let numQuestions = parseInt(numQuestionsStr, 10);
    if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 50) {
      return NextResponse.json({ error: "Số lượng câu hỏi phải nằm trong khoảng 1 đến 50." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    let documentText = "";
    const fileParts: { inlineData: { data: string; mimeType: string } }[] = [];

    // Xử lý từng file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} quá lớn (tối đa ${MAX_FILE_SIZE_MB}MB).` }, { status: 400 });
      }

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
        try {
          const result = await mammoth.extractRawText({ buffer });
          documentText += `\n--- Tài liệu: ${file.name} ---\n${result.value}\n`;
        } catch (e) {
          return NextResponse.json({ error: `Không thể đọc file DOCX: ${file.name}` }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: `Định dạng file không hỗ trợ: ${file.name}` }, { status: 400 });
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

Bạn PHẢI trả về dữ liệu dưới dạng JSON nguyên chất (không được bọc trong markdown block \`\`\`json) với cấu trúc SAU ĐÂY:
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
      "correctAnswer": "A",
      "explanation": "Giải thích ngắn gọn dựa trên tài liệu"
    }
  ]
}
`;

    const parts: Part[] = [{ text: prompt }];
    
    if (documentText.trim()) {
      parts.push({ text: "\n\n--- NỘI DUNG TÀI LIỆU ---\n\n" + documentText });
    }
    
    if (fileParts.length > 0) {
      parts.push(...fileParts);
    }

    let modelName = formData.get("model") as string || "gemini-2.5-flash";
    if (!ALLOWED_MODELS.includes(modelName)) {
      modelName = "gemini-2.5-flash"; // Fallback to safe model if injected
    }

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

    // Parse JSON an toàn hơn
    let parsedData: any;
    try {
      // Vì đã cài đặt responseMimeType="application/json", thường responseText đã là JSON hợp lệ.
      // Nhưng nếu AI vẫn trả markdown block thì cắt nó đi.
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\n/, "").replace(/\n```$/, "");
      }
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback fallback: regex trích xuất mảng JSON
      try {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        } else {
          throw new Error();
        }
      } catch (e2) {
        console.error("Lỗi parse JSON:", responseText);
        return NextResponse.json({ error: "AI không trả về đúng định dạng JSON hoặc dữ liệu quá dài bị cắt đứt." }, { status: 500 });
      }
    }

    // Validation schema căn bản
    if (!parsedData || !Array.isArray(parsedData.questions)) {
      return NextResponse.json({ error: "Dữ liệu trả về không đúng cấu trúc (thiếu questions array)." }, { status: 500 });
    }

    const validQuestions = [];
    for (const q of parsedData.questions) {
      if (
        q.text && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        ["A", "B", "C", "D"].includes(q.correctAnswer)
      ) {
        validQuestions.push({
          id: crypto.randomUUID(),
          text: String(q.text),
          options: q.options.map((opt: any) => ({
            label: String(opt.label),
            text: String(opt.text)
          })),
          correctAnswer: String(q.correctAnswer),
          explanation: String(q.explanation || "")
        });
      }
    }

    if (validQuestions.length === 0) {
      return NextResponse.json({ error: "AI đã tạo phản hồi nhưng không có câu hỏi nào hợp lệ." }, { status: 500 });
    }

    // Ép chặt số lượng câu hỏi đúng với yêu cầu của người dùng
    if (validQuestions.length > numQuestions) {
      validQuestions.splice(numQuestions);
    }

    return NextResponse.json({ questions: validQuestions });

  } catch (error: unknown) {
    console.error("Lỗi xử lý API:", error);
    
    let errorMessage = "Lỗi máy chủ nội bộ.";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Xử lý lỗi từ Google Gemini
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("limit: 0")) {
        errorMessage = "Đã vượt quá giới hạn lượt dùng miễn phí (Rate Limit) của model này. Vui lòng chọn model 'Gemini 2.5 Flash Lite' hoặc đợi một lúc rồi thử lại.";
      } else if (errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
        errorMessage = "Hệ thống AI của Google hiện đang quá tải (High Demand). Vui lòng đợi khoảng 1-2 phút rồi ấn tạo lại nhé!";
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
