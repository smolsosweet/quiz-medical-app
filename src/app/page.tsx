"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import UploadConfig from "@/components/UploadConfig";
import QuizInterface from "@/components/QuizInterface";
import { Question, QuizSession, QuizRound, AnswerLabel } from "@/types";

export default function Home() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  
  // History State
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Accumulated current session data
  const [currentRounds, setCurrentRounds] = useState<QuizRound[]>([]);

  // Review Mode state
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Storage states
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [scope, setScope] = useState("");
  const [previousQuestionsText, setPreviousQuestionsText] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [quizId, setQuizId] = useState(0);

  const handleGenerate = async (numQ: number, isAddingMore = false) => {
    if (files.length === 0) {
      setError("Vui lòng tải lên tài liệu.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append("files", file);
      });
      formData.append("model", model);
      formData.append("numQuestions", numQ.toString());
      if (scope.trim()) {
        formData.append("scope", scope.trim());
      }
      
      let updatedPrevText = previousQuestionsText;
      if (isAddingMore && questions) {
        const newPrevText = questions.map(q => q.text).join('\n');
        updatedPrevText = previousQuestionsText ? previousQuestionsText + '\n' + newPrevText : newPrevText;
      }
      if (updatedPrevText) {
        formData.append("previousQuestionsText", updatedPrevText);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        if (resText.includes("<!DOCTYPE") || resText.includes("<html") || res.status === 504 || res.status === 502) {
          throw new Error("Quá thời gian xử lý của Server (Timeout). Tài liệu quá dài khiến AI xử lý lố 100 giây. Vui lòng thử các cách sau: 1) Chọn phiên bản 'Gemini 2.5 Flash Lite' để chạy nhanh hơn. 2) Cắt bớt tài liệu. 3) Giảm số lượng câu hỏi.");
        }
        throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi tạo câu hỏi.");
      }
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        if (isAddingMore) {
          setPreviousQuestionsText(updatedPrevText);
        }
        setQuizId(prev => prev + 1);
        if (!currentSessionId) {
          setCurrentSessionId(Date.now().toString());
        }
      } else {
        throw new Error("Không thể tạo câu hỏi từ tài liệu này.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Lỗi không xác định.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinishRound = (userAnswers: Record<string, AnswerLabel>) => {
    if (questions && currentSessionId) {
      const newRound: QuizRound = {
        id: `Lần ${currentRounds.length + 1}`,
        questions: [...questions],
        userAnswers: { ...userAnswers }
      };
      
      const newRounds = [...currentRounds, newRound];
      setCurrentRounds(newRounds);

      // Cập nhật session lịch sử ngay lập tức
      const updatedSession: QuizSession = {
        id: currentSessionId,
        title: files.length > 0 ? files[0].name : "Không rõ tài liệu",
        date: new Date().toLocaleString(),
        filesCount: files.length,
        rounds: newRounds
      };

      setSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === currentSessionId);
        if (existingIdx >= 0) {
          const newSessions = [...prev];
          newSessions[existingIdx] = updatedSession;
          return newSessions;
        }
        return [updatedSession, ...prev];
      });
    }
  };

  const handleNewFile = () => {
    setQuestions(null);
    setFiles([]);
    setPreviousQuestionsText("");
    setCurrentSessionId(null);
    setCurrentRounds([]);
    setIsReviewMode(false);
    setError("");
  };

  const handleViewHistory = (session: QuizSession) => {
    setCurrentSessionId(session.id);
    setCurrentRounds(session.rounds);
    setIsReviewMode(true);
    setQuestions(null); // Mở mode Review
  };

  return (
    <>
      <Header />
      <main className="main-container">
        {!questions && !isReviewMode ? (
          <UploadConfig 
            onGenerate={(numQ) => handleGenerate(numQ, false)}
            isGenerating={isGenerating}
            error={error}
            files={files}
            setFiles={setFiles}
            model={model}
            setModel={setModel}
            scope={scope}
            setScope={setScope}
            sessions={sessions}
            onViewHistory={handleViewHistory}
          />
        ) : (
          <QuizInterface 
            key={isReviewMode ? `review-${currentSessionId}` : quizId}
            questions={isReviewMode ? [] : (questions || [])} 
            isReviewMode={isReviewMode}
            historyRounds={currentRounds}
            onGenerateMore={(numQ) => handleGenerate(numQ, true)}
            onFinishRound={handleFinishRound}
            isGenerating={isGenerating}
            error={error}
            onNewFile={handleNewFile}
          />
        )}
      </main>
    </>
  );
}
