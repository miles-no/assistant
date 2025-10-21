import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	helperText?: string;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{ className, label, error, helperText, leftIcon, rightIcon, ...props },
		ref,
	) => {
		return (
			<div className="w-full">
				{label && (
					<label className="mb-1.5 block text-sm font-medium text-gray-700">
						{label}
					</label>
				)}
				<div className="relative">
					{leftIcon && (
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
							{leftIcon}
						</div>
					)}
					<input
						ref={ref}
						className={cn(
							"w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-colors",
							"placeholder:text-gray-400",
							"focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20",
							"disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
							error &&
								"border-danger-500 focus:border-danger-500 focus:ring-danger-500",
							leftIcon && "pl-10",
							rightIcon && "pr-10",
							className,
						)}
						{...props}
					/>
					{rightIcon && (
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
							{rightIcon}
						</div>
					)}
				</div>
				{error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}
				{helperText && !error && (
					<p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
				)}
			</div>
		);
	},
);

Input.displayName = "Input";

export default Input;
