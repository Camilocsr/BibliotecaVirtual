import { toErrorWithMessage } from "./toErrorWithMessage";

export function getErrorMessage(error: unknown) {
    return toErrorWithMessage(error).message;
}