import { CHOICES, type ChoiceList } from "@/lib/choices";

export function FormHeader({ title, number, children }: { title: string; number?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
        <div className="text-lg font-semibold text-sn-dark">{number ?? "New record"}</div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-8 gap-y-3 p-4 md:grid-cols-2">{children}</div>;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-200">
      <h3 className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

type FieldProps = { label: string; required?: boolean; full?: boolean; children: React.ReactNode };

export function Field({ label, required, full, children }: FieldProps) {
  return (
    <label className={`grid grid-cols-[9rem_1fr] items-start gap-2 text-sm ${full ? "md:col-span-2" : ""}`}>
      <span className="pt-1.5 text-right text-gray-700">
        {required && <span className="mr-0.5 text-red-600">*</span>}
        {label}
      </span>
      <span>{children}</span>
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; full?: boolean };

export function TextField({ label, full, ...rest }: InputProps) {
  return (
    <Field label={label} required={rest.required} full={full}>
      <input className="input" {...rest} defaultValue={rest.defaultValue ?? ""} />
    </Field>
  );
}

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function TextArea({ label, rows = 4, ...rest }: AreaProps) {
  return (
    <Field label={label} required={rest.required} full>
      <textarea className="input" rows={rows} {...rest} defaultValue={rest.defaultValue ?? ""} />
    </Field>
  );
}

type ChoiceProps = {
  label: string;
  name: string;
  list: ChoiceList;
  value?: string | number | null;
  required?: boolean;
  disabled?: boolean;
  allowEmpty?: boolean;
  full?: boolean;
};

export function ChoiceField({ label, name, list, value, required, disabled, allowEmpty, full }: ChoiceProps) {
  return (
    <Field label={label} required={required} full={full}>
      <select name={name} className="input" defaultValue={value == null ? "" : String(value)} required={required} disabled={disabled}>
        {allowEmpty && <option value="">-- None --</option>}
        {CHOICES[list].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </Field>
  );
}

type RefProps = {
  label: string;
  name: string;
  options: { id: string; label: string }[];
  value?: string | null;
  required?: boolean;
  disabled?: boolean;
  full?: boolean;
};

/** Reference field rendered as a select of records. */
export function RefField({ label, name, options, value, required, disabled, full }: RefProps) {
  return (
    <Field label={label} required={required} full={full}>
      <select name={name} className="input" defaultValue={value ?? ""} required={required} disabled={disabled}>
        <option value="">-- None --</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function ReadOnly({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <Field label={label} full={full}>
      <div className="min-h-[2rem] rounded border border-transparent px-2 py-1.5 text-sm text-gray-800">{value || <span className="text-gray-400">—</span>}</div>
    </Field>
  );
}

/**
 * Pressing Enter in a field "clicks" the form's first submit button. Forms whose header holds
 * extra action buttons put this first so Enter performs the normal save.
 */
export function DefaultSubmit() {
  return <button type="submit" hidden aria-hidden tabIndex={-1} />;
}

/** For forms where every button is a distinct decision: Enter does nothing. */
export function NoImplicitSubmit() {
  return <button type="submit" disabled hidden aria-hidden tabIndex={-1} />;
}
