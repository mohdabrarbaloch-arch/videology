"use client";

import { useState, useEffect } from "react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizInterfaceProps {
  videoId: string;
  quizId: string;
  title: string;
  questionsJson: string;
}

export default function QuizInterface({ videoId, quizId, title, questionsJson }: QuizInterfaceProps) {
  const [questions] = useState<QuizQuestion[]>(() => {
    try {
      return JSON.parse(questionsJson);
    } catch {
      return [];
    }
  });

  const storageKey = `quiz-progress-${quizId}`;

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answersMap, setAnswersMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (questions.length === 0) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.totalQuestions !== questions.length) return;
      setCurrentQ(saved.currentQ ?? 0);
      setScore(saved.score ?? 0);
      setAnswersMap(saved.answersMap ?? {});
    } catch {
      // ignore corrupt data
    }
  }, [storageKey, questions.length]);

  const q = questions[currentQ];

  function persistProgress(updatedCurrentQ: number, updatedScore: number, updatedAnswersMap: Record<number, number>) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        currentQ: updatedCurrentQ,
        score: updatedScore,
        totalQuestions: questions.length,
        answersMap: updatedAnswersMap,
      }));
    } catch {
      // ignore storage errors
    }
  }

  function handleSelect(index: number) {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    const newScore = index === q.correctIndex ? score + 1 : score;
    if (index === q.correctIndex) {
      setScore((s) => s + 1);
    }
    const newAnswersMap = { ...answersMap, [currentQ]: index };
    setAnswersMap(newAnswersMap);
    persistProgress(currentQ, newScore, newAnswersMap);
  }

  async function handleNext() {
    if (currentQ < questions.length - 1) {
      const nextQ = currentQ + 1;
      setCurrentQ(nextQ);
      setSelected(null);
      setAnswered(false);
      persistProgress(nextQ, score, answersMap);
    } else {
      setFinished(true);
      try {
        localStorage.removeItem(storageKey);
        await fetch(`/api/videos/${videoId}/quiz`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, score }),
        });
      } catch {
        // ignore save errors
      }
    }
  }

  if (questions.length === 0) {
    return <p className="text-sm text-(--fg)/40">No questions available.</p>;
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-(--border) bg-(--input-bg) p-8 text-center">
        <div className="text-4xl font-bold text-(--fg)">{percentage}%</div>
        <div className="mt-2 text-sm text-(--fg)/50">
          {score} out of {questions.length} correct
        </div>
        <div className="mt-6 text-sm text-(--fg)/40">
          {percentage >= 80 ? "Excellent work!" : percentage >= 50 ? "Good effort!" : "Keep studying!"}
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="mb-4 text-base font-semibold text-(--fg)">{title}</h3>
      )}

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-(--fg)/40">
          Question {currentQ + 1} of {questions.length}
        </span>
        <span className="text-xs text-(--fg)/40">Score: {score}</span>
      </div>

      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-(--btn)/10">
        <div
          className="h-full rounded-full bg-(--accent) transition-all"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-(--border) bg-(--input-bg) p-6">
        <h3 className="text-sm font-semibold text-(--fg)">{q.question}</h3>

        <div className="mt-5 space-y-3">
          {q.options.map((opt, i) => {
            let style = "border-(--border-2) bg-(--surface-1) hover:border-(--border-3) hover:bg-(--surface-2)";

            if (answered) {
              if (i === q.correctIndex) {
                style = "border-green-400/40 bg-green-400/10";
              } else if (i === selected && i !== q.correctIndex) {
                style = "border-red-400/40 bg-red-400/10";
              } else {
                style = "border-(--border) bg-(--surface-0) opacity-40";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${style}`}
              >
                <span className="mr-3 text-xs text-(--fg)/30">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-5 rounded-xl border border-(--border) bg-(--surface-1) p-4">
            <p className="text-xs text-(--fg)/50">{q.explanation}</p>
          </div>
        )}
      </div>

      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-xl bg-(--btn) px-5 py-3 text-sm font-semibold text-(--btn-fg) transition hover:bg-(--btn-hover)"
        >
          {currentQ < questions.length - 1 ? "Next Question" : "Finish Quiz"}
        </button>
      )}
    </div>
  );
}
