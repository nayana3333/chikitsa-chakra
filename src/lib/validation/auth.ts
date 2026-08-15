import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, { error: "First name must be at least 2 characters." })
      .max(50)
      .trim(),
    lastName: z
      .string()
      .min(1, { error: "Last name is required." })
      .max(50)
      .trim(),
    email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, {
        error: "Enter a valid 10-digit Indian mobile number.",
      })
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, { error: "Use at least 8 characters." })
      .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
      .regex(/[0-9]/, { error: "Include at least one number." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Shape returned by auth Server Actions to `useActionState`. */
export type AuthFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;
