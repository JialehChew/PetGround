import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Formik, Form, Field } from 'formik';
import type { FormikHelpers, FieldProps } from 'formik';
import * as Yup from 'yup';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
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
import authService from '../../services/authService';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps extends React.ComponentProps<"div"> {
  token: string;
}

export function ResetPasswordForm({
  token,
  className,
  ...props
}: ResetPasswordFormProps) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const ResetPasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        password: Yup.string()
          .min(6, t('validation.passwordMin'))
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('validation.passwordPattern'))
          .required(t('validation.passwordRequired')),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref('password')], t('validation.passwordMismatch'))
          .required(t('validation.confirmRequired')),
      }),
    [t]
  );

  const handleSubmit = async (
    values: ResetPasswordFormValues,
    { setSubmitting, setFieldError, setStatus }: FormikHelpers<ResetPasswordFormValues>
  ) => {
    try {
      setStatus(null);
      await authService.resetPassword(token, values.password);
      setIsSuccess(true);
    } catch (error: unknown) {
      const apiError = error as { error?: string };
      const errorMessage = apiError.error || t('errors.resetFailed');

      setStatus(errorMessage);

      if (errorMessage.toLowerCase().includes('password')) {
        setFieldError('password', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
            >
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </motion.div>
            <CardTitle className="text-xl">{t('reset.successTitle')}</CardTitle>
            <CardDescription>{t('reset.successDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              {t('reset.continueLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('reset.title')}</CardTitle>
          <CardDescription>{t('reset.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik<ResetPasswordFormValues>
            initialValues={{
              password: '',
              confirmPassword: '',
            }}
            validationSchema={ResetPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, status, values }) => (
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

                  <div className="grid gap-3">
                    <Label htmlFor="password">{t('reset.newPassword')}</Label>
                    <div className="relative">
                      <Field name="password">
                        {({ field }: FieldProps) => (
                          <Input
                            {...field}
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('reset.newPasswordPlaceholder')}
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

                    {values.password && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs space-y-1"
                      >
                        <div className={`flex items-center ${values.password.length >= 6 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {t('register.pwHintLength')}
                        </div>
                        <div className={`flex items-center ${/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {t('register.pwHintComplex')}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">{t('reset.confirmNew')}</Label>
                    <div className="relative">
                      <Field name="confirmPassword">
                        {({ field }: FieldProps) => (
                          <Input
                            {...field}
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={t('reset.confirmPlaceholder')}
                            className={`pr-10 ${errors.confirmPassword && touched.confirmPassword ? 'border-destructive' : ''}`}
                            required
                          />
                        )}
                      </Field>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive"
                      >
                        {errors.confirmPassword}
                      </motion.p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('reset.submitting')}
                      </>
                    ) : (
                      t('reset.submit')
                    )}
                  </Button>

                  <Button variant="ghost" className="w-full" asChild>
                    <Link to="/login" className="flex items-center justify-center">
                      <ArrowLeftIcon className="mr-2 h-4 w-4" />
                      {t('forgot.backLogin')}
                    </Link>
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}
