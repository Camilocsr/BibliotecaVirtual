import { ErrorWithMessage } from "../../@types/LibroController";
import { isErrorWithMessage } from "./isErrorWithMessage";

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (isErrorWithMessage(maybeError)) return maybeError;
    try {
        return new Error(JSON.stringify(maybeError));
    } catch {
        return new Error(String(maybeError));
    }
}