// Simulation of React component lifecycle for QuizInterface when viewing history
const React = {
  // Mocking state and effects
};

function simulateQuizInterfaceMount(props) {
  console.log("=== SIMULATING QuizInterface MOUNT ===");
  console.log("Props received:", {
    questionsCount: props.questions.length,
    isReviewMode: props.isReviewMode,
    historyRoundsCount: props.historyRounds.length
  });

  // State initializations (useState)
  let currentIndex = 0;
  let userAnswers = {};
  let isFinished = props.isReviewMode;
  let showReview = props.isReviewMode;
  let hasFinishedRef = { current: false };

  console.log("Initial State:", { isFinished, showReview, currentIndex });

  // First Render
  console.log("\n--- Render 1 (Initial) ---");
  let currentQuestion = props.questions && props.questions.length > 0 ? props.questions[currentIndex] : null;
  
  if (isFinished) {
    if (!showReview) {
      console.log("Render 1 Output: Score summary screen");
    } else {
      console.log("Render 1 Output: History Review Section (#review-section) with", props.historyRounds.length, "rounds");
    }
  } else {
    if (!currentQuestion) {
      console.log("Render 1 Output: NULL (Blank Screen!)");
    } else {
      console.log("Render 1 Output: Quiz Question UI");
    }
  }

  // Effect Execution on Mount (in order of declaration)
  console.log("\n--- Executing useEffect Hooks on Mount ---");
  
  // Effect 1: [isReviewMode]
  console.log("Executing Effect 1 ([isReviewMode]):");
  if (props.isReviewMode) {
    isFinished = true;
    showReview = true;
    console.log("  -> set isFinished = true, showReview = true");
  }

  // Effect 2: [questions]
  console.log("Executing Effect 2 ([questions]):");
  hasFinishedRef.current = false;
  currentIndex = 0;
  userAnswers = {};
  isFinished = false;
  showReview = false;
  console.log("  -> set isFinished = false, showReview = false (OVERWRITING Effect 1!)");

  // Re-render triggered by state change
  console.log("\n--- Render 2 (After Mount Effects) ---");
  currentQuestion = props.questions && props.questions.length > 0 ? props.questions[currentIndex] : null;

  if (isFinished) {
    if (!showReview) {
      console.log("Render 2 Output: Score summary screen");
    } else {
      console.log("Render 2 Output: History Review Section");
    }
  } else {
    if (!currentQuestion) {
      console.log("Render 2 Output: NULL (CRITICAL: Screen becomes completely blank!)");
    } else {
      console.log("Render 2 Output: Quiz Question UI");
    }
  }
}

// Case: User clicks "Xem lại lịch sử"
// In page.tsx:
// handleViewHistory sets:
// isReviewMode = true
// questions = null -> passed as questions={isReviewMode ? [] : (questions || [])} -> []
simulateQuizInterfaceMount({
  questions: [],
  isReviewMode: true,
  historyRounds: [
    {
      id: "Lần 1",
      questions: [{ id: "q1", text: "Test question?", options: [], correctAnswer: "A", explanation: "Test" }],
      userAnswers: { q1: "A" }
    }
  ]
});
