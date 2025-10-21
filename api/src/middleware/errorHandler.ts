import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
	err: Error,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	console.error("Error:", err);

	if (err instanceof ZodError) {
		res.status(400).json({
			error: "Validation error",
			details: err.errors.map((e) => ({
				path: e.path.join("."),
				message: e.message,
			})),
		});
		return;
	}

	res.status(500).json({
		error: "Internal server error",
		message: process.env.NODE_ENV === "development" ? err.message : undefined,
	});
};
