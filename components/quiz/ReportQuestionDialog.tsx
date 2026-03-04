// components/quiz/ReportQuestionDialog.tsx
'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { submitQuestionReport } from '@/lib/question-report-service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { QuizQuestion } from '@/ai/schemas';

interface ReportQuestionDialogProps {
  question: QuizQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizFormat?: string;
  slotId?: string;
  userAnswer?: string;
}

const reportReasons = [
  'Incorrect Answer',
  'Typo in Question/Options',
  'Question is Ambiguous',
  'Inappropriate Content',
  'Technical Issue',
  'Other',
] as const;

const ReportQuestionInputSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  reason: z.string().min(1, 'Please select a reason'),
  comment: z.string().optional(),
  userId: z.string(),
});

type ReportFormValues = z.infer<typeof ReportQuestionInputSchema>;

export default function ReportQuestionDialog({
  question,
  open,
  onOpenChange,
  quizFormat = 'Unknown',
  slotId = 'Unknown',
  userAnswer = 'N/A',
}: ReportQuestionDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(ReportQuestionInputSchema),
    defaultValues: {
      questionId: question?.id || '',
      questionText: question?.question || '',
      reason: '',
      comment: '',
      userId: user?.uid || '',
    },
  });

  useEffect(() => {
    if (question) {
      form.reset({
        questionId: question.id,
        questionText: question.question,
        reason: '',
        comment: '',
        userId: user?.uid || '',
      });
    }
  }, [question, user, form]);

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: ReportFormValues) => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be signed in to report a question.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await submitQuestionReport({
        questionId: data.questionId || `q_${Date.now()}`,
        questionText: data.questionText,
        options: question?.options || [],
        correctAnswer: question?.correctAnswer || '',
        userAnswer: userAnswer,
        explanation: question?.explanation || '',
        reportedByUserId: user.uid,
        reportedByName: user.displayName || 'Anonymous',
        reportedByEmail: user.email || '',
        reason: data.reason as (typeof reportReasons)[number],
        comment: data.comment || '',
        quizFormat: quizFormat,
        slotId: slotId,
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping us improve the quiz!',
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Help us improve the quiz by reporting any issues with this question.
          </DialogDescription>
        </DialogHeader>

        <div className="text-xs italic bg-muted p-2 rounded-md">
          &quot;{question?.question}&quot;
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="report-question-form"
          >
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason for your report" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reportReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional Comment</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide any additional details..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="report-question-form"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
