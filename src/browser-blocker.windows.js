// Run by cscript.exe, not Node/Bun. Ignore all arguments, including the URL.
// Exit 0 means "handled" to Python webbrowser, preventing browser fallback.
WScript.StdErr.WriteLine("AGY_INTERACTIVE_LOGIN_BLOCKED");
WScript.Quit(0);
