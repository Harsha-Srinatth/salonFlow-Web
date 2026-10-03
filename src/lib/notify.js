import { toast } from "sonner";
// One toast API for customer screens: deduped by kind+title, errors linger longer,
// and every call can carry a short description and an action ({ label, onClick }).
const DURATION = { success: 4500, info: 4500, message: 4500, warning: 6000, error: 7000 };
function show(kind, title, opts = {}) {
    const text = (typeof title === "string" ? title : title?.message) || (kind === "error" ? "Something went wrong" : "Done");
    const { action, ...rest } = opts;
    return toast[kind](text, { id: `${kind}:${text}`, duration: DURATION[kind], action, ...rest });
}
export const notify = {
    success: (title, opts) => show("success", title, opts),
    error: (title, opts) => show("error", title, opts),
    warning: (title, opts) => show("warning", title, opts),
    info: (title, opts) => show("info", title, opts),
    message: (title, opts) => show("message", title, opts),
    // One toast that moves loading -> success/error.
    promise: (promise, { loading, success, error }) => toast.promise(promise, { loading, success, error, duration: DURATION.success }),
    dismiss: toast.dismiss,
};
