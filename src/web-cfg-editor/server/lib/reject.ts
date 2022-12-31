import {H3Event} from "h3";

/**
 * Rejects the request with the given status code and message.
 * @param event The event.
 * @param message The message.
 * @param code The status code.
 */
export default function (event: H3Event, message: string, code: number = 400) {
    event.node.res.statusCode = code
    return {error: message}
}
