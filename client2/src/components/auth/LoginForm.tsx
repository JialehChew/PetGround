import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Formik, Form, Field } from 'formik';
import type { FormikHelpers, FieldProps } from 'formik';
import * as Yup from 'yup';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import LoadingSpinner from '../ui/loading-spinner';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation(['auth', 'common']);
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const LoginSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .email(t('auth:validation.emailInvalid'))
          .required(t('auth:validation.emailRequired')),
        password: Yup.string().required(t('auth:validation.passwordRequired')),
      }),
    [t]
  );

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting, setFieldError, setStatus }: FormikHelpers<LoginFormValues>
  ) => {
    try {
      setStatus(null);
      await login(values.email, values.password);
    } catch (error: unknown) {
      const apiError = error as { error?: string };
      const errorMessage = apiError.error || t('auth:errors.loginFailed');

      setStatus(errorMessage);

      if (errorMessage.toLowerCase().includes('email')) {
        setFieldError('email', errorMessage);
      } else if (errorMessage.toLowerCase().includes('password')) {
        setFieldError('password', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth:login.title')}</CardTitle>
          <CardDescription>{t('auth:login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, status }) => (
              <Form>
                <div className="grid gap-6">
                  {status && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm"
                    >
                      {status}
                    </motion.div>
                  )}

                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="email">{t('auth:login.email')}</Label>
                      <Field name="email">
                        {({ field }: FieldProps) => (
                          <Input
                            {...field}
                            ref={emailInputRef}
                            id="email"
                            type="email"
                            placeholder={t('auth:login.emailPlaceholder')}
                            className={errors.email && touched.email ? 'border-destructive' : ''}
                            required
                          />
                        )}
                      </Field>
                      {errors.email && touched.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </div>
                    <div className="grid gap-3">
                      <div className="flex items-center">
                        <Label htmlFor="password">{t('auth:login.password')}</Label>
                        <Link
                          to="/forgot-password"
                          className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-primary"
                        >
                          {t('auth:login.forgotPassword')}
                        </Link>
                      </div>
                      <div className="relative">
                        <Field name="password">
                          {({ field }: FieldProps) => (
                            <Input
                              {...field}
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              className={`pr-10 ${errors.password && touched.password ? 'border-destructive' : ''}`}
                              required
                            />
                          )}
                        </Field>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && touched.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive"
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          {t('auth:login.submitting')}
                        </>
                      ) : (
                        t('auth:login.submit')
                      )}
                    </Button>
                  </div>
                  <div className="text-center text-sm">
                    {t('auth:noAccount')}{' '}
                    <Link to="/register" className="underline underline-offset-4">
                      {t('auth:signUpLink')}
                    </Link>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        {t('auth:legal.agreePrefix')}{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-4 hover:text-primary">
          {t('auth:legal.terms')}
        </a>{' '}
        {t('auth:legal.and')}{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-4 hover:text-primary">
          {t('auth:legal.privacy')}
        </a>
        {t('auth:legal.suffix')}
      </div>
    </div>
  );
}
