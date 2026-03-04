// app/components/history/ReviewDialog.tsx
'use client';

import { useState, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Award } from 'lucide-react';
import type { QuizAttempt, QuizQuestion } from '@/ai/schemas';
import ReportQuestionDialog from '@/components/quiz/ReportQuestionDialog';
import { normalizeTimestamp } from '@/lib/dates';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attempt: QuizAttempt;
}

const ReviewDialogComponent = ({
  open,
  onOpenChange,
  attempt,
}: ReviewDialogProps) => {
  const [reportingQuestion, setReportingQuestion] =
    useState<QuizQuestion | null>(null);
  const [reportingIndex, setReportingIndex] = useState<number>(-1);

  if (!attempt) return null;

  const handleReportClick = (question: QuizQuestion, index: number) => {
    setReportingQuestion(question);
    setReportingIndex(index);
  };

  const attemptDate = normalizeTimestamp(attempt.timestamp);
  const formattedDate = attemptDate
    ? attemptDate.toLocaleDateString('en-GB')
    : 'Invalid Date';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              Answer Review
            </DialogTitle>
            <DialogDescription className="text-center">
              For the {attempt.format} quiz on {formattedDate}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4 py-4">
            {attempt.questions.map((question, index) => (
              <Card
                key={`${attempt.slotId}-${question.id}-${index}`}
                className="bg-card/50"
              >
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">
                    {index + 1}. {question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p className="flex items-start gap-2">
                      {attempt.userAnswers[index] === question.correctAnswer ? (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <span>
                        Your Answer:{' '}
                        <span className="font-semibold">
                          {attempt.userAnswers[index] || 'Not Answered'}
                        </span>
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>
                        Correct Answer:{' '}
                        <span className="font-semibold">
                          {question.correctAnswer}
                        </span>
                      </span>
                    </p>
                  </div>
                  <Card className="bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground font-semibold">
                      EXPLANATION
                    </p>
                    <p className="text-sm">{question.explanation}</p>
                  </Card>
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleReportClick(question, index)}
                    >
                      Report this question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {reportingQuestion && (
        <ReportQuestionDialog
          question={reportingQuestion}
          open={!!reportingQuestion}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setReportingQuestion(null);
              setReportingIndex(-1);
            }
          }}
          quizFormat={attempt.format}
          slotId={attempt.slotId}
          userAnswer={
            reportingIndex >= 0
              ? attempt.userAnswers[reportingIndex]
              : undefined
          }
        />
      )}
    </>
  );
};

export default memo(ReviewDialogComponent);
