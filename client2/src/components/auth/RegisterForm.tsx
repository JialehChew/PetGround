import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Formik, Form, Field } from 'formik';
import type { FormikHelpers, FieldProps } from 'formik';
import * as Yup from 'yup';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
import { toast } from 'sonner';

/** Normalize to local MY digits (01…, 10–11 digits) for Yup / submit */
function normalizeMyPhoneInput(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("60") && d.length >= 11) d = d.slice(2);
  return d;
}

interface RegisterFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t, i18n } = useTranslation('auth');
  const { register } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const RegisterSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string()
          .min(2, t('validation.nameMin'))
          .required(t('validation.nameRequired')),
        email: Yup.string()
          .email(t('validation.emailInvalid'))
          .required(t('validation.emailRequired')),
        phone: Yup.string()
          .required(t('validation.phoneRequired'))
          .test("my-phone", t("validation.phoneInvalid"), (v) =>
            /^01\d{8,9}$/.test(normalizeMyPhoneInput(String(v || "")))
          ),
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
    values: RegisterFormValues,
    { setSubmitting, setFieldError, setStatus }: FormikHelpers<RegisterFormValues>
  ) => {
    try {
      setStatus(null);
      const phoneDigits = normalizeMyPhoneInput(values.phone);
      const userData = {
        name: values.name,
        email: values.email,
        phone: phoneDigits,
        password: values.password,
        role: 'owner' as const,
        locale: (i18n.language?.startsWith('zh') ? 'zh' : 'en') as 'zh' | 'en',
      };
      const res = await register(userData);
      if (res.verificationEmailSent === false && res.verificationEmailNotice) {
        toast.warning(t('register.emailNoticeTitle'), {
          description: res.verificationEmailNotice,
          duration: 9000,
        });
      }
    } catch (error: unknown) {
      const apiError = error as { error?: string };
      const errorMessage = apiError.error || t('errors.registerFailed');

      setStatus(errorMessage);

      if (errorMessage.toLowerCase().includes('email')) {
        setFieldError('email', t('errors.emailTaken'));
      }
      const lower = errorMessage.toLowerCase();
      if (
        lower.includes('phone number is required') ||
        errorMessage.includes('请填写手机号')
      ) {
        setFieldError('phone', t('validation.phoneRequired'));
      } else if (
        lower.includes('already registered') ||
        errorMessage.includes('已被注册')
      ) {
        setFieldError('phone', t('errors.phoneTaken'));
      } else if (
        lower.includes('invalid phone') ||
        errorMessage.includes('手机号格式') ||
        lower.includes('phone number')
      ) {
        setFieldError('phone', t('validation.phoneInvalid'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik<RegisterFormValues>
            initialValues={{
              name: '',
              email: '',
              phone: '',
              password: '',
              confirmPassword: '',
            }}
            validationSchema={RegisterSchema}
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

                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      <Label htmlFor="name">{t('register.fullName')}</Label>
                      <Field name="name">
                        {({ field }: FieldProps) => (
                          <Input
                            {...field}
                            ref={nameInputRef}
                            id="name"
                            placeholder={t('register.namePlaceholder')}
                            className={errors.name && touched.name ? 'border-destructive' : ''}
                            required
                          />
                        )}
                      </Field>
                      {errors.name && touched.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive"
                        >
                          {errors.name}
                        </motion.p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="email">{t('register.email')}</Label>
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

                    <div className="grid gap-3">
                      <Label htmlFor="phone">{t('register.phone')}</Label>
                      <Field name="phone">
                        {({ field }: FieldProps) => (
                          <Input
                            {...field}
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder={t('register.phonePlaceholder')}
                            className={errors.phone && touched.phone ? 'border-destructive' : ''}
                            required
                          />
                        )}
                      </Field>
                      <p className="text-xs text-muted-foreground">{t('register.phoneHint')}</p>
                      {errors.phone && touched.phone && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive"
                        >
                          {errors.phone}
                        </motion.p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="password">{t('register.password')}</Label>
                      <div className="relative">
                        <Field name="password">
                          {({ field }: FieldProps) => (
                            <Input
                              {...field}
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder={t('register.passwordPlaceholder')}
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
                      <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
                      <div className="relative">
                        <Field name="confirmPassword">
                          {({ field }: FieldProps) => (
                            <Input
                              {...field}
                              id="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder={t('register.confirmPlaceholder')}
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
                          {t('register.submitting')}
                        </>
                      ) : (
                        t('register.submit')
                      )}
                    </Button>
                  </div>
                  <div className="text-center text-sm">
                    {t('register.haveAccount')}{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      {t('register.signInLink')}
                    </Link>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        {t('legal.agreePrefix')}{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-4 hover:text-primary">
          {t('legal.terms')}
        </a>{' '}
        {t('legal.and')}{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-4 hover:text-primary">
          {t('legal.privacy')}
        </a>
        {t('legal.suffix')}
      </div>
    </div>
  );
}
