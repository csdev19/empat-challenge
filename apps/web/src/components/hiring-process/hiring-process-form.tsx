import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label, Textarea } from "@empat-challenge/web-ui";
import type { CreateHiringProcessInput } from "@/hooks/use-hiring-processes";
import type { CreateCompanyDetailsInput } from "@/hooks/use-company-details";
import {
  HIRING_PROCESS_STATUSES,
  HIRING_PROCESS_STATUS_INFO,
  DEFAULT_HIRING_PROCESS_STATUS,
  CURRENCIES,
  CURRENCY_INFO,
  SALARY_RATE_TYPES,
  SALARY_RATE_TYPE_LABELS,
  type HiringProcessStatus,
  type Currency,
  type SalaryRateType,
} from "@empat-challenge/domain/constants";
import { ChevronDown, ChevronUp } from "lucide-react";

interface HiringProcessFormProps {
  initialValues?: Partial<CreateHiringProcessInput>;
  initialCompanyDetails?: Partial<CreateCompanyDetailsInput>;
  onSubmit: (data: CreateHiringProcessInput, companyDetails?: CreateCompanyDetailsInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const contactedViaOptions = [
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "Email", label: "Email" },
  { value: "Facebook", label: "Facebook" },
  { value: "Other", label: "Other" },
];

const statusOptions: { value: HiringProcessStatus; label: string }[] = [
  {
    value: HIRING_PROCESS_STATUSES.FIRST_CONTACT,
    label: HIRING_PROCESS_STATUS_INFO[HIRING_PROCESS_STATUSES.FIRST_CONTACT].label,
  },
  {
    value: HIRING_PROCESS_STATUSES.ONGOING,
    label: HIRING_PROCESS_STATUS_INFO[HIRING_PROCESS_STATUSES.ONGOING].label,
  },
  {
    value: HIRING_PROCESS_STATUSES.ON_HOLD,
    label: HIRING_PROCESS_STATUS_INFO[HIRING_PROCESS_STATUSES.ON_HOLD].label,
  },
  {
    value: HIRING_PROCESS_STATUSES.REJECTED,
    label: HIRING_PROCESS_STATUS_INFO[HIRING_PROCESS_STATUSES.REJECTED].label,
  },
  {
    value: HIRING_PROCESS_STATUSES.DROPPED_OUT,
    label: HIRING_PROCESS_STATUS_INFO[HIRING_PROCESS_STATUSES.DROPPED_OUT].label,
  },
  {
    value: HIRING_PROCESS_STATUSES.HIRED,
    label: HIRING_PROCESS_STATUS_INFO[HIRING_PROCESS_STATUSES.HIRED].label,
  },
];

const currencyOptions: { value: Currency; label: string; symbol: string }[] = [
  {
    value: CURRENCIES.USD,
    label: CURRENCY_INFO[CURRENCIES.USD].label,
    symbol: CURRENCY_INFO[CURRENCIES.USD].symbol,
  },
  {
    value: CURRENCIES.PEN,
    label: CURRENCY_INFO[CURRENCIES.PEN].label,
    symbol: CURRENCY_INFO[CURRENCIES.PEN].symbol,
  },
];

const salaryRateTypeOptions: { value: SalaryRateType; label: string }[] = [
  {
    value: SALARY_RATE_TYPES.MONTHLY,
    label: SALARY_RATE_TYPE_LABELS[SALARY_RATE_TYPES.MONTHLY],
  },
  {
    value: SALARY_RATE_TYPES.HOURLY,
    label: SALARY_RATE_TYPE_LABELS[SALARY_RATE_TYPES.HOURLY],
  },
];

export function HiringProcessForm({
  initialValues,
  initialCompanyDetails,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
}: HiringProcessFormProps) {
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);

  // Memoize default values to avoid recreating form on every render
  const defaultValues = useMemo(
    () => ({
      companyName: initialValues?.companyName || "",
      jobTitle: initialValues?.jobTitle || "",
      status: initialValues?.status || DEFAULT_HIRING_PROCESS_STATUS,
      salary: initialValues?.salary,
      currency: initialValues?.currency || CURRENCIES.USD,
      salaryRateType: initialValues?.salaryRateType || SALARY_RATE_TYPES.MONTHLY,
    }),
    [
      initialValues?.companyName,
      initialValues?.jobTitle,
      initialValues?.status,
      initialValues?.salary,
      initialValues?.currency,
      initialValues?.salaryRateType,
    ],
  );

  const defaultCompanyDetailsValues = useMemo(
    () => ({
      website: initialCompanyDetails?.website || "",
      location: initialCompanyDetails?.location || "",
      benefits: initialCompanyDetails?.benefits || "",
      contactedVia: initialCompanyDetails?.contactedVia || "",
      contactPerson: initialCompanyDetails?.contactPerson || "",
      hiringProcessSteps: initialCompanyDetails?.interviewSteps || 0,
    }),
    [
      initialCompanyDetails?.website,
      initialCompanyDetails?.location,
      initialCompanyDetails?.benefits,
      initialCompanyDetails?.contactedVia,
      initialCompanyDetails?.contactPerson,
      initialCompanyDetails?.interviewSteps,
    ],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const companyDetailsData: CreateCompanyDetailsInput = {
        website: companyDetailsForm.state.values.website || undefined,
        location: companyDetailsForm.state.values.location || undefined,
        benefits: companyDetailsForm.state.values.benefits || undefined,
        contactedVia: companyDetailsForm.state.values.contactedVia || undefined,
        contactPerson: companyDetailsForm.state.values.contactPerson || undefined,
        interviewSteps: companyDetailsForm.state.values.hiringProcessSteps || undefined,
      };

      // Only include company details if at least one field is filled
      const hasCompanyDetails = Object.values(companyDetailsData).some(
        (val) => val !== undefined && val !== "" && val !== 0,
      );

      onSubmit(value, hasCompanyDetails ? companyDetailsData : undefined);
    },
  });

  const companyDetailsForm = useForm({
    defaultValues: defaultCompanyDetailsValues,
  });

  // Update form values when initialValues change (for edit mode)
  useEffect(() => {
    if (initialValues) {
      form.setFieldValue("companyName", initialValues.companyName || "");
      form.setFieldValue("jobTitle", initialValues.jobTitle || "");
      form.setFieldValue("status", initialValues.status || DEFAULT_HIRING_PROCESS_STATUS);
      form.setFieldValue("currency", initialValues.currency || CURRENCIES.USD);
      if (initialValues.salaryRateType !== undefined) {
        form.setFieldValue("salaryRateType", initialValues.salaryRateType);
      }
      if (initialValues.salary !== undefined) {
        form.setFieldValue("salary", initialValues.salary);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialValues?.companyName,
    initialValues?.jobTitle,
    initialValues?.status,
    initialValues?.salary,
    initialValues?.currency,
    initialValues?.salaryRateType,
  ]);

  // Update company details form values when initialCompanyDetails change
  useEffect(() => {
    if (initialCompanyDetails) {
      companyDetailsForm.setFieldValue("website", initialCompanyDetails.website || "");
      companyDetailsForm.setFieldValue("location", initialCompanyDetails.location || "");
      companyDetailsForm.setFieldValue("benefits", initialCompanyDetails.benefits || "");
      companyDetailsForm.setFieldValue("contactedVia", initialCompanyDetails.contactedVia || "");
      companyDetailsForm.setFieldValue("contactPerson", initialCompanyDetails.contactPerson || "");
      companyDetailsForm.setFieldValue(
        "hiringProcessSteps",
        initialCompanyDetails.interviewSteps || 0,
      );
      if (initialCompanyDetails.website || initialCompanyDetails.location) {
        setShowCompanyDetails(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialCompanyDetails?.website,
    initialCompanyDetails?.location,
    initialCompanyDetails?.benefits,
    initialCompanyDetails?.contactedVia,
    initialCompanyDetails?.contactPerson,
    initialCompanyDetails?.interviewSteps,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="companyName"
        validators={{
          onChange: ({ value }) =>
            !value
              ? "Company name is required"
              : value.length < 1
                ? "Company name is required"
                : undefined,
        }}
      >
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="companyName">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter company name"
              disabled={isSubmitting}
            />
            {field.state.meta.errors && (
              <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="jobTitle">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">Job Title (Optional)</Label>
            <Input
              id="jobTitle"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g., Frontend Developer, React Native Developer, DevOps Engineer"
              disabled={isSubmitting}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="status">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <select
              id="status"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as HiringProcessStatus)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </form.Field>

      <form.Field name="salaryRateType">
        {(rateTypeField) => {
          const salaryLabel =
            rateTypeField.state.value === SALARY_RATE_TYPES.MONTHLY
              ? "Monthly Salary (Optional)"
              : "Hourly Rate (Optional)";
          return (
            <form.Field name="currency">
              {(currencyField) => (
                <form.Field name="salary">
                  {(salaryField) => (
                    <div className="space-y-2">
                      <Label htmlFor="salary">{salaryLabel}</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            id="salary"
                            type="number"
                            min="0"
                            max="25000"
                            value={salaryField.state.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              salaryField.handleChange(value ? Number(value) : undefined);
                            }}
                            placeholder="Enter salary (optional)"
                            disabled={isSubmitting}
                          />
                        </div>
                        <select
                          id="salaryRateType"
                          value={rateTypeField.state.value}
                          onChange={(e) =>
                            rateTypeField.handleChange(e.target.value as SalaryRateType)
                          }
                          onBlur={rateTypeField.handleBlur}
                          className="flex h-8 w-28 rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isSubmitting}
                        >
                          {salaryRateTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          id="currency"
                          value={currencyField.state.value}
                          onChange={(e) => currencyField.handleChange(e.target.value as Currency)}
                          className="flex h-8 w-24 rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isSubmitting}
                        >
                          {currencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </form.Field>
              )}
            </form.Field>
          );
        }}
      </form.Field>

      {/* Company Details Section */}
      <div className="border-t pt-4 mt-4">
        <button
          type="button"
          onClick={() => setShowCompanyDetails(!showCompanyDetails)}
          className="flex items-center justify-between w-full text-left"
          disabled={isSubmitting}
        >
          <Label className="text-sm font-medium cursor-pointer">Company Details (Optional)</Label>
          {showCompanyDetails ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        {showCompanyDetails && (
          <div className="space-y-4 mt-4">
            <companyDetailsForm.Field name="website">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://example.com"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </companyDetailsForm.Field>

            <companyDetailsForm.Field name="location">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="City, Country"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </companyDetailsForm.Field>

            <companyDetailsForm.Field name="benefits">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="benefits">Benefits</Label>
                  <Textarea
                    id="benefits"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe company benefits..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </companyDetailsForm.Field>

            <companyDetailsForm.Field name="contactedVia">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="contactedVia">Contacted Via</Label>
                  <select
                    id="contactedVia"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    <option value="">Select an option</option>
                    {contactedViaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </companyDetailsForm.Field>

            <companyDetailsForm.Field name="contactPerson">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="@username or name"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </companyDetailsForm.Field>

            <companyDetailsForm.Field name="hiringProcessSteps">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="hiringProcessSteps">Hiring Process Steps</Label>
                  <Input
                    id="hiringProcessSteps"
                    type="number"
                    min="0"
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </companyDetailsForm.Field>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
