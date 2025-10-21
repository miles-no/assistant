import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores";

export default function ToastContainer() {
	const { toasts, removeToast } = useToastStore();

	const icons = {
		success: <CheckCircle2 className="h-5 w-5" />,
		error: <AlertCircle className="h-5 w-5" />,
		warning: <AlertTriangle className="h-5 w-5" />,
		info: <Info className="h-5 w-5" />,
	};

	const variants = {
		success: "bg-success-50 text-success-900 border-success-200",
		error: "bg-danger-50 text-danger-900 border-danger-200",
		warning: "bg-warning-50 text-warning-900 border-warning-200",
		info: "bg-primary-50 text-primary-900 border-primary-200",
	};

	if (toasts.length === 0) return null;

	return (
		<div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-end gap-2 p-4 sm:p-6">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={cn(
						"pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all",
						variants[toast.type],
					)}
				>
					<div className="flex-shrink-0">{icons[toast.type]}</div>
					<div className="flex-1">
						<p className="text-sm font-medium">{toast.message}</p>
					</div>
					<button
						onClick={() => removeToast(toast.id)}
						className="flex-shrink-0 rounded-md p-1 hover:bg-black hover:bg-opacity-10"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			))}
		</div>
	);
}
