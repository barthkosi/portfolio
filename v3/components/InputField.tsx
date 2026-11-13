"use client";

type InputFieldProps = {
  className?: string;
  size?: "Small" | "Large";
  title?: string;
  name?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function InputField({
  className,
  size = "Small",
  title = "Title",
  name,
  type = "text",
  value,
  onChange,
}: InputFieldProps) {
  return (
    <div className={className || "relative flex w-full flex-col items-start gap-2"}>
      <div className="relative flex h-fit w-fit shrink-0 items-center justify-center gap-0 px-2">
        <label className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
          {title}
        </label>
      </div>
      {size === "Large" ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="body-xs h-[80px] w-full shrink-0 resize-none touch-manipulation overflow-clip rounded-[4px] bg-background-tertiary p-2 text-content-secondary outline-none"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="body-xs h-[34px] w-full shrink-0 touch-manipulation overflow-clip rounded-[4px] bg-background-tertiary p-2 text-content-secondary outline-none"
        />
      )}
    </div>
  );
}
