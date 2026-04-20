import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Formik, Form, Field } from 'formik';
import type { FormikHelpers, FieldProps } from 'formik';
import * as Yup from 'yup';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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

interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation('auth');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const ForgotPasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .email(t('validation.emailInvalid'))
          .required(t('validation.emailRequired')),
      }),
    [t]
  );

  const handleSubmit = async (
    values: ForgotPasswordFormValues,
    { setSubmitting, setFieldError, setStatus }: FormikHelpers<ForgotPasswordFormValues>
  ) => {
    try {
      setStatus(null);
      await authService.forgotPassword(values.email);
      setIsSubmitted(true);
    } catch (error: unknown) {
      const apiError = error as { error?: string };
      const errorMessage = apiError.error || t('errors.resetEmailFailed');

      setStatus(errorMessage);

      if (errorMessage.toLowerCase().includes('email')) {
        setFieldError('email', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
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
            <CardTitle className="text-xl">{t('forgot.checkTitle')}</CardTitle>
            <CardDescription>{t('forgot.checkDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('forgot.checkHint')}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsSubmitted(false)}
                >
                  {t('forgot.tryAgain')}
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <Link to="/login" className="flex items-center justify-center">
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    {t('forgot.backLogin')}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('forgot.title')}</CardTitle>
          <CardDescription>{t('forgot.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik<ForgotPasswordFormValues>
            initialValues={{
              email: '',
            }}
            validationSchema={ForgotPasswordSchema}
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

                  <div className="grid gap-3">
                    <Label htmlFor="email">{t('login.email')}</Label>
                    <Field name="email">
                      {({ field }: FieldProps) => (
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          placeholder={t('login.emailPlaceholder')}
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

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('forgot.sending')}
                      </>
                    ) : (
                      t('forgot.sendLink')
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
