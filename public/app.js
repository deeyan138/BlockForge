const $ = id => document.getElementById(id);
let token = sessionStorage.getItem("p2b"), lang = "python", ws, loading = false, typingTimer;

/* ---------- API ---------- */
async function api(path, data) {
  let r, j;
  try {
    r = await fetch("/api/" + path, { method: "POST", headers: { "Content-Type": "application/json", "x-token": token || "" }, body: JSON.stringify(data) });
    j = await r.json();
  } catch { return { error: "Cannot reach the BlockForge server. Run npm start and open http://localhost:3000 (not the HTML file directly)." }; }
  if (r.status === 401 && path !== "login" && path !== "register") logout();
  return j;
}
const status = t => $("status").textContent = t;

/* ---------- login ---------- */
function showApp() {
  if (typeof Blockly === "undefined") { $("loginErr").textContent = "Signed in, but Blockly could not load. Check your internet connection and refresh."; return; }
  $("login").hidden = true; $("app").hidden = false; if (!ws) initBlockly(); Blockly.svgResize(ws);
}
function logout() { sessionStorage.removeItem("p2b"); token = null; $("app").hidden = true; $("login").hidden = false; }
let mode = "login";
document.querySelectorAll(".tabs button").forEach(t => t.onclick = () => {
  mode = t.dataset.mode;
  document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === t));
  $("loginBtn").textContent = mode === "login" ? "Sign in" : "Create account";
  $("p").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("loginErr").textContent = "";
});
$("loginBtn").onclick = async () => {
  const user = $("u").value.trim(), pass = $("p").value;
  if (!user || !pass) return $("loginErr").textContent = "Enter a username and password.";
  $("loginBtn").disabled = true;
  const r = await api(mode, { user, pass });
  $("loginBtn").disabled = false;
  if (r.token) { token = r.token; sessionStorage.setItem("p2b", token); $("loginErr").textContent = ""; $("p").value = ""; showApp(); }
  else $("loginErr").textContent = r.error || "Could not sign in.";
};
$("eye").onclick = () => { const s = $("p").type === "password"; $("p").type = s ? "text" : "password"; $("eye").textContent = s ? "Hide" : "Show"; };
$("p").onkeydown = e => { if (e.key === "Enter") $("loginBtn").click(); };
$("logout").onclick = logout;

/* ---------- block definitions ---------- */
const C = { io: "#9966FF", num: "#59C059", v: "#FF8C1A", logic: "#4C97FF", loop: "#FFAB19", list: "#FF661A", text: "#CF63CF", func: "#FF6680" }; // Scratch palette
const fi = (name, text) => ({ type: "field_input", name, text });
const dd = (name, opts) => ({ type: "field_dropdown", name, options: opts.map(o => [o, o]) });
const val = name => ({ type: "input_value", name });
const st = name => ({ type: "input_statement", name });
const S = { previousStatement: null, nextStatement: null };
Blockly.defineBlocksWithJsonArray([
  { type: "text_block", message0: "text %1", args0: [fi("TEXT", "hello")], output: "String", colour: C.io },
  { type: "number_block", message0: "number %1", args0: [{ type: "field_number", name: "NUMBER", value: 0 }], output: "Number", colour: C.num },
  { type: "input_block", message0: "input", output: "String", colour: C.io },
  { type: "print_block", message0: "print %1", args0: [val("VALUE")], ...S, colour: C.io },
  { type: "create_variable", message0: "create variable %1", args0: [fi("VAR", "x")], ...S, colour: C.v },
  { type: "set_variable", message0: "set %1 to %2", args0: [fi("VAR", "x"), val("VALUE")], ...S, colour: C.v },
  { type: "change_variable", message0: "change %1 by %2", args0: [fi("VAR", "x"), val("VALUE")], ...S, colour: C.v },
  { type: "get_variable", message0: "get %1", args0: [fi("VAR", "x")], output: null, colour: C.v },
  { type: "math_block", message0: "%1 %2 %3", args0: [val("LEFT"), dd("OP", ["+", "-", "*", "/", "%", "//", "**"]), val("RIGHT")], inputsInline: true, output: "Number", colour: C.num },
  { type: "comparison_block", message0: "%1 %2 %3", args0: [val("LEFT"), dd("OP", [">", "<", "==", ">=", "<=", "!="]), val("RIGHT")], inputsInline: true, output: "Boolean", colour: C.logic },
  { type: "and_block", message0: "%1 and %2", args0: [val("LEFT"), val("RIGHT")], inputsInline: true, output: "Boolean", colour: C.logic },
  { type: "or_block", message0: "%1 or %2", args0: [val("LEFT"), val("RIGHT")], inputsInline: true, output: "Boolean", colour: C.logic },
  { type: "if_block", message0: "if %1", args0: [val("CONDITION")], message1: "do %1", args1: [st("DO")], ...S, colour: C.logic },
  { type: "if_else_block", message0: "if %1", args0: [val("CONDITION")], message1: "do %1", args1: [st("DO")], message2: "else %1", args2: [st("ELSE")], ...S, colour: C.logic },
  { type: "repeat_block", message0: "repeat %1 times", args0: [val("TIMES")], message1: "do %1", args1: [st("DO")], ...S, colour: C.loop },
  { type: "while_block", message0: "while %1", args0: [val("CONDITION")], message1: "do %1", args1: [st("DO")], ...S, colour: C.loop },
  { type: "for_block", message0: "for %1 from %2 to %3", args0: [fi("VAR", "i"), val("FROM"), val("TO")], message1: "do %1", args1: [st("DO")], ...S, colour: C.loop },
  { type: "create_list", message0: "create list %1", args0: [fi("LIST", "items")], ...S, colour: C.list },
  { type: "add_to_list", message0: "add %1 to list %2", args0: [val("ITEM"), fi("LIST", "items")], ...S, colour: C.list },
  { type: "get_item", message0: "item %1 of %2", args0: [val("INDEX"), fi("LIST", "items")], output: null, colour: C.list },
  { type: "boolean_block", message0: "%1", args0: [dd("BOOL", ["True", "False"])], output: "Boolean", colour: C.logic },
  { type: "not_block", message0: "not %1", args0: [val("VALUE")], output: "Boolean", colour: C.logic },
  { type: "print_inline_block", message0: "print (no new line) %1", args0: [val("VALUE")], ...S, colour: C.io },
  { type: "input_number_block", message0: "input as %1", args0: [dd("TYPE", ["int", "float"])], output: "Number", colour: C.io },
  { type: "text_join_block", message0: "join %1 + %2", args0: [val("LEFT"), val("RIGHT")], inputsInline: true, output: "String", colour: C.text },
  { type: "to_text_block", message0: "text of %1", args0: [val("VALUE")], output: "String", colour: C.text },
  { type: "length_block", message0: "length of %1", args0: [val("VALUE")], output: "Number", colour: C.text },
  { type: "math_func_block", message0: "%1 of %2", args0: [dd("FUNC", ["abs", "sqrt", "round", "floor", "ceil", "int", "float"]), val("VALUE")], inputsInline: true, output: "Number", colour: C.num },
  { type: "random_block", message0: "random from %1 to %2", args0: [val("FROM"), val("TO")], inputsInline: true, output: "Number", colour: C.num },
  { type: "min_max_block", message0: "%1 of %2 and %3", args0: [dd("FUNC", ["min", "max"]), val("LEFT"), val("RIGHT")], inputsInline: true, output: "Number", colour: C.num },
  { type: "math_assign_block", message0: "%1 %2 %3", args0: [fi("VAR", "x"), dd("OP", ["-=", "*=", "/=", "%="]), val("VALUE")], inputsInline: true, ...S, colour: C.v },
  { type: "contains_block", message0: "%1 in list %2", args0: [val("ITEM"), fi("LIST", "items")], inputsInline: true, output: "Boolean", colour: C.list },
  { type: "set_item", message0: "set item %1 of %2 to %3", args0: [val("INDEX"), fi("LIST", "items"), val("VALUE")], inputsInline: true, ...S, colour: C.list },
  { type: "remove_item", message0: "remove item %1 of %2", args0: [val("INDEX"), fi("LIST", "items")], inputsInline: true, ...S, colour: C.list },
  { type: "sort_list", message0: "sort list %1 %2", args0: [fi("LIST", "items"), dd("ORDER", ["ascending", "descending"])], ...S, colour: C.list },
  { type: "for_each_block", message0: "for each %1 in %2", args0: [fi("VAR", "item"), fi("LIST", "items")], message1: "do %1", args1: [st("DO")], ...S, colour: C.loop },
  { type: "break_block", message0: "break", ...S, colour: C.loop },
  { type: "continue_block", message0: "continue", ...S, colour: C.loop },
  { type: "define_function_block", message0: "define function %1 ( %2 ) returns %3", args0: [fi("NAME", "greet"), fi("PARAMS", ""), dd("RET", ["nothing", "number", "text", "boolean"])], message1: "do %1", args1: [st("BODY")], ...S, colour: C.func },
  { type: "return_block", message0: "return %1", args0: [val("VALUE")], ...S, colour: C.func },
  { type: "call_block", message0: "call %1 %2 %3 %4 %5", args0: [fi("NAME", "greet"), val("ARG1"), val("ARG2"), val("ARG3"), val("ARG4")], inputsInline: true, ...S, colour: C.func },
  { type: "call_value_block", message0: "call %1 %2 %3 %4 %5", args0: [fi("NAME", "calc"), val("ARG1"), val("ARG2"), val("ARG3"), val("ARG4")], inputsInline: true, output: null, colour: C.func },
  { type: "buffer_block", message0: "unsupported: %1 (%2)", args0: [fi("CODE", "code"), fi("REASON", "reason")], ...S, colour: 0 }
]);

/* ---------- generators (Python + Java from one table) ---------- */
const mk = name => {
  const g = new Blockly.Generator(name); g.INDENT = "    "; g.forBlock = {};
  g.scrub_ = (b, code, only) => { const n = b.nextConnection && b.nextConnection.targetBlock(); return code + (only || !n ? "" : g.blockToCode(n)); };
  return g;
};
const gens = { python: mk("Python"), java: mk("Java"), cpp: mk("Cpp"), js: mk("JavaScript") };
const V = (g, b, n, o = 99) => g.valueToCode(b, n, o);
const body = (g, b, n, j) => g.statementToCode(b, n) || (j ? "" : "    pass\n");
const dec = (g, name, type, init) => { g.vt[name] = [type, init]; };
const F = {
  text_block: (g, b) => [JSON.stringify(b.getFieldValue("TEXT")), 0],
  number_block: (g, b) => [String(b.getFieldValue("NUMBER")), 0],
  input_block: (g, b, j) => [j ? "sc.nextLine()" : "input()", 0],
  print_block: (g, b, j) => { const x = V(g, b, "VALUE") || (j ? '""' : "None"); return j ? `System.out.println(${x});\n` : `print(${x})\n`; },
  create_variable: (g, b, j) => { const n = b.getFieldValue("VAR"); if (j) { dec(g, n, "double", "0"); return `${n} = 0;\n`; } return `${n} = None\n`; },
  set_variable: (g, b, j) => {
    const n = b.getFieldValue("VAR"), x = V(g, b, "VALUE") || "0", c = b.getInputTargetBlock("VALUE"), str = c && ["text_block", "input_block"].includes(c.type);
    if (j) { dec(g, n, str ? "String" : "double", str ? '""' : "0"); return `${n} = ${x};\n`; }
    return `${n} = ${x}\n`;
  },
  change_variable: (g, b, j) => { const n = b.getFieldValue("VAR"); if (j) dec(g, n, "double", "0"); return `${n} += ${V(g, b, "VALUE") || 0}${j ? ";" : ""}\n`; },
  get_variable: (g, b) => [b.getFieldValue("VAR"), 0],
  math_block: (g, b) => [`${V(g, b, "LEFT", 0) || 0} ${b.getFieldValue("OP")} ${V(g, b, "RIGHT", 0) || 0}`, 1],
  comparison_block: (g, b) => [`${V(g, b, "LEFT", 0) || 0} ${b.getFieldValue("OP")} ${V(g, b, "RIGHT", 0) || 0}`, 1],
  and_block: (g, b, j) => [`${V(g, b, "LEFT", 0) || (j ? "false" : "False")} ${j ? "&&" : "and"} ${V(g, b, "RIGHT", 0) || (j ? "false" : "False")}`, 1],
  or_block: (g, b, j) => [`${V(g, b, "LEFT", 0) || (j ? "false" : "False")} ${j ? "||" : "or"} ${V(g, b, "RIGHT", 0) || (j ? "false" : "False")}`, 1],
  if_block: (g, b, j) => { const c = V(g, b, "CONDITION") || (j ? "false" : "False"), d = body(g, b, "DO", j); return j ? `if (${c}) {\n${d}}\n` : `if ${c}:\n${d}`; },
  if_else_block: (g, b, j) => { const c = V(g, b, "CONDITION") || (j ? "false" : "False"), d = body(g, b, "DO", j), e = body(g, b, "ELSE", j); return j ? `if (${c}) {\n${d}} else {\n${e}}\n` : `if ${c}:\n${d}else:\n${e}`; },
  repeat_block: (g, b, j) => { const t = V(g, b, "TIMES") || 0, d = body(g, b, "DO", j), i = "_i" + (g.n = (g.n || 0) + 1); return j ? `for (int ${i} = 0; ${i} < ${t}; ${i}++) {\n${d}}\n` : `for _ in range(${t}):\n${d}`; },
  while_block: (g, b, j) => { const c = V(g, b, "CONDITION") || (j ? "false" : "False"), d = body(g, b, "DO", j); return j ? `while (${c}) {\n${d}}\n` : `while ${c}:\n${d}`; },
  for_block: (g, b, j) => { const v = b.getFieldValue("VAR"), a = V(g, b, "FROM") || 0, t = V(g, b, "TO") || 0, d = body(g, b, "DO", j); return j ? `for (int ${v} = ${a}; ${v} < ${t}; ${v}++) {\n${d}}\n` : `for ${v} in range(${a}, ${t}):\n${d}`; },
  create_list: (g, b, j) => { const n = b.getFieldValue("LIST"); if (j) { dec(g, n, "ArrayList<Object>", "new ArrayList<>()"); return `${n} = new ArrayList<>();\n`; } return `${n} = []\n`; },
  add_to_list: (g, b, j) => { const n = b.getFieldValue("LIST"), x = V(g, b, "ITEM") || "None"; if (j) dec(g, n, "ArrayList<Object>", "new ArrayList<>()"); return j ? `${n}.add(${x});\n` : `${n}.append(${x})\n`; },
  get_item: (g, b, j) => [j ? `${b.getFieldValue("LIST")}.get((int) (${V(g, b, "INDEX") || 0}))` : `${b.getFieldValue("LIST")}[${V(g, b, "INDEX") || 0}]`, 0],
  buffer_block: (g, b, j) => j ? `// unsupported: ${b.getFieldValue("CODE")}\n` : `${b.getFieldValue("CODE")}\n`
};
const STRT = ["text_block", "input_block", "text_join_block", "to_text_block"], BOOLT = ["comparison_block", "and_block", "or_block", "not_block", "boolean_block", "contains_block"];
const INIT = { String: '""', boolean: "false", double: "0" };
const kindOf = (g, c) => { const t = !c ? "double" : STRT.includes(c.type) ? "String" : BOOLT.includes(c.type) ? "boolean" : c.type === "call_value_block" ? (g.fn[c.getFieldValue("NAME")] || {}).t : c.type === "get_variable" ? (g.vt[c.getFieldValue("VAR")] || [])[0] : "double"; return INIT[t] ? t : "double"; };
const sw = (g, b, n, j) => { const c = b.getInputTargetBlock(n), x = V(g, b, n, 0) || '""'; return c && STRT.includes(c.type) ? x : j ? `String.valueOf(${x})` : `str(${x})`; };
const cargs = (g, b) => [1, 2, 3, 4].map(i => V(g, b, "ARG" + i, 0)).filter(Boolean).join(", ");
const fv = (b, n) => b.getFieldValue(n);
Object.assign(F, {
  set_variable: (g, b, j) => { const n = fv(b, "VAR"), x = V(g, b, "VALUE") || "0"; if (j) { const t = kindOf(g, b.getInputTargetBlock("VALUE")); dec(g, n, t, INIT[t]); } return `${n} = ${x}${j ? ";" : ""}\n`; },
  math_block: (g, b, j) => { const o = fv(b, "OP"), l = V(g, b, "LEFT", 0) || 0, r = V(g, b, "RIGHT", 0) || 0; if (j && o === "//") return [`Math.floor(${l} / ${r})`, 0]; if (j && o === "**") return [`Math.pow(${l}, ${r})`, 0]; return [`${l} ${o} ${r}`, 1]; },
  get_item: (g, b, j) => { const n = fv(b, "LIST"), i = V(g, b, "INDEX") || 0; if (!j) return [`${n}[${i}]`, 0]; return [(g.vt[n] || [])[0] === "String" ? `String.valueOf(${n}.charAt((int) (${i})))` : `${n}.get((int) (${i}))`, 0]; },
  boolean_block: (g, b, j) => [j ? fv(b, "BOOL").toLowerCase() : fv(b, "BOOL"), 0],
  not_block: (g, b, j) => { const x = V(g, b, "VALUE", 0) || (j ? "false" : "False"); return [j ? `!(${x})` : `not ${x}`, 1]; },
  print_inline_block: (g, b, j) => { const x = V(g, b, "VALUE") || '""'; return j ? `System.out.print(${x});\n` : `print(${x}, end="")\n`; },
  input_number_block: (g, b, j) => { const i = fv(b, "TYPE") === "int"; return [j ? (i ? "Integer.parseInt(sc.nextLine().trim())" : "Double.parseDouble(sc.nextLine().trim())") : (i ? "int(input())" : "float(input())"), 0]; },
  text_join_block: (g, b, j) => [`${sw(g, b, "LEFT", j)} + ${sw(g, b, "RIGHT", j)}`, 1],
  to_text_block: (g, b, j) => { const x = V(g, b, "VALUE") || 0; return [j ? `String.valueOf(${x})` : `str(${x})`, 0]; },
  length_block: (g, b, j) => { const c = b.getInputTargetBlock("VALUE"), x = V(g, b, "VALUE", 0) || '""'; if (!j) return [`len(${x})`, 0]; const s = c && (STRT.includes(c.type) || (c.type === "get_variable" && (g.vt[fv(c, "VAR")] || [])[0] === "String")); return [`${x}.${s ? "length" : "size"}()`, 0]; },
  math_func_block: (g, b, j) => { const f = fv(b, "FUNC"), x = V(g, b, "VALUE") || 0; if (j) return [f === "int" ? `(int) (${x})` : f === "float" ? `(double) (${x})` : `Math.${f}(${x})`, 0]; if (["sqrt", "floor", "ceil"].includes(f)) { g.imp.add("math"); return [`math.${f}(${x})`, 0]; } return [`${f}(${x})`, 0]; },
  random_block: (g, b, j) => { const a = V(g, b, "FROM") || 0, t = V(g, b, "TO") || 0; if (j) return [`((int) (Math.random() * ((${t}) - (${a}) + 1)) + ${a})`, 0]; g.imp.add("random"); return [`random.randint(${a}, ${t})`, 0]; },
  min_max_block: (g, b, j) => [`${j ? "Math." : ""}${fv(b, "FUNC")}(${V(g, b, "LEFT") || 0}, ${V(g, b, "RIGHT") || 0})`, 0],
  math_assign_block: (g, b, j) => { const n = fv(b, "VAR"); if (j) dec(g, n, "double", "0"); return `${n} ${fv(b, "OP")} ${V(g, b, "VALUE") || 0}${j ? ";" : ""}\n`; },
  contains_block: (g, b, j) => { const n = fv(b, "LIST"), x = V(g, b, "ITEM", 0) || 0; return [j ? `${n}.contains(${x})` : `${x} in ${n}`, 1]; },
  set_item: (g, b, j) => { const n = fv(b, "LIST"), i = V(g, b, "INDEX") || 0, x = V(g, b, "VALUE") || 0; return j ? `${n}.set((int) (${i}), ${x});\n` : `${n}[${i}] = ${x}\n`; },
  remove_item: (g, b, j) => { const n = fv(b, "LIST"), i = V(g, b, "INDEX") || 0; return j ? `${n}.remove((int) (${i}));\n` : `${n}.pop(${i})\n`; },
  sort_list: (g, b, j) => { const n = fv(b, "LIST"), d = fv(b, "ORDER") === "descending"; return j ? `${n}.sort(${d ? "Collections.reverseOrder()" : "null"});\n` : `${n}.sort(${d ? "reverse=True" : ""})\n`; },
  for_each_block: (g, b, j) => { const v = fv(b, "VAR"), l = fv(b, "LIST"), d = body(g, b, "DO", j); return j ? `for (Object ${v} : ${l}) {\n${d}}\n` : `for ${v} in ${l}:\n${d}`; },
  break_block: (g, b, j) => j ? "break;\n" : "break\n",
  continue_block: (g, b, j) => j ? "continue;\n" : "continue\n",
  return_block: (g, b, j) => { const x = V(g, b, "VALUE"); return `return${x ? " " + x : ""}${j ? ";" : ""}\n`; },
  call_block: (g, b, j) => `${fv(b, "NAME")}(${cargs(g, b)})${j ? ";" : ""}\n`,
  call_value_block: (g, b) => [`${fv(b, "NAME")}(${cargs(g, b)})`, 0],
  define_function_block: (g, b, j) => {
    const n = fv(b, "NAME"), ps = fv(b, "PARAMS").split(",").map(s => s.trim()).filter(Boolean).map(s => { const [a, t] = s.split(":").map(x => x.trim()); return { a, t: { text: "String", boolean: "boolean" }[t] || "double" }; });
    const saved = g.vt; g.vt = {}; ps.forEach(p => g.vt[p.a] = [p.t, ""]);
    const d = body(g, b, "BODY", j), loc = g.vt; g.vt = saved;
    if (!j) { g.funcs.push(`def ${n}(${ps.map(p => p.a).join(", ")}):\n${d}`); return ""; }
    const decl = Object.entries(loc).filter(([k]) => !ps.some(p => p.a === k)).map(([k, [t, i]]) => `        ${t} ${k} = ${i};\n`).join("");
    g.funcs.push(`    static ${(g.fn[n] || {}).t || "void"} ${n}(${ps.map(p => p.t + " " + p.a).join(", ")}) {\n${decl}${d.replace(/^(?=.)/gm, "    ")}    }\n`); return "";
  }
});
for (const [name, fn] of Object.entries(F)) { gens.python.forBlock[name] = (b, g) => fn(g, b, false); gens.java.forBlock[name] = (b, g) => fn(g, b, true); }
const CT = t => ({ String: "string", boolean: "bool" }[t] || t);
const CPP = {
  input_block: () => ["rl()", 0],
  print_block: (g, b) => `cout << ${V(g, b, "VALUE") || '""'} << endl;\n`,
  print_inline_block: (g, b) => `cout << ${V(g, b, "VALUE") || '""'};\n`,
  input_number_block: (g, b) => [`${fv(b, "TYPE") === "int" ? "stoi" : "stod"}(rl())`, 0],
  text_join_block: (g, b) => { const f = n => { const c = b.getInputTargetBlock(n), x = V(g, b, n, 0) || '""'; return c && STRT.includes(c.type) ? `string(${x})` : `to_string(${x})`; }; return [`${f("LEFT")} + ${f("RIGHT")}`, 1]; },
  to_text_block: (g, b) => { const c = b.getInputTargetBlock("VALUE"), x = V(g, b, "VALUE") || 0; return [c && STRT.includes(c.type) ? x : `to_string(${x})`, 0]; },
  length_block: (g, b) => { const c = b.getInputTargetBlock("VALUE"), x = V(g, b, "VALUE", 0) || '""', s = c && (STRT.includes(c.type) || (c.type === "get_variable" && (g.vt[fv(c, "VAR")] || [])[0] === "String")); return [s ? `(int) string(${x}).size()` : `(int) ${x}.size()`, 0]; },
  math_block: (g, b) => { const o = fv(b, "OP"), l = V(g, b, "LEFT", 0) || 0, r = V(g, b, "RIGHT", 0) || 0; return o === "//" ? [`floor(${l} / ${r})`, 0] : o === "**" ? [`pow(${l}, ${r})`, 0] : o === "%" ? [`fmod(${l}, ${r})`, 0] : [`${l} ${o} ${r}`, 1]; },
  math_func_block: (g, b) => { const f = fv(b, "FUNC"), x = V(g, b, "VALUE") || 0; return [f === "int" ? `(int) (${x})` : f === "float" ? `(double) (${x})` : `${f === "abs" ? "fabs" : f}(${x})`, 0]; },
  random_block: (g, b) => { g.rand = 1; const a = V(g, b, "FROM") || 0, t = V(g, b, "TO") || 0; return [`(rand() % ((int) (${t}) - (int) (${a}) + 1) + (int) (${a}))`, 0]; },
  min_max_block: (g, b) => [`${fv(b, "FUNC")}((double) (${V(g, b, "LEFT") || 0}), (double) (${V(g, b, "RIGHT") || 0}))`, 0],
  math_assign_block: (g, b) => { const n = fv(b, "VAR"), o = fv(b, "OP")[0], x = V(g, b, "VALUE") || 0; dec(g, n, "double", "0"); return o === "%" ? `${n} = fmod(${n}, ${x});\n` : `${n} ${o}= ${x};\n`; },
  create_list: (g, b) => { const n = fv(b, "LIST"); dec(g, n, "vector<double>", "{}"); return `${n}.clear();\n`; },
  add_to_list: (g, b) => { const n = fv(b, "LIST"), s = kindOf(g, b.getInputTargetBlock("ITEM")) === "String"; dec(g, n, s ? "vector<string>" : "vector<double>", "{}"); return `${n}.push_back(${V(g, b, "ITEM") || 0});\n`; },
  get_item: (g, b) => { const n = fv(b, "LIST"), i = V(g, b, "INDEX") || 0; return [(g.vt[n] || [])[0] === "String" ? `string(1, ${n}[(int) (${i})])` : `${n}[(int) (${i})]`, 0]; },
  set_item: (g, b) => `${fv(b, "LIST")}[(int) (${V(g, b, "INDEX") || 0})] = ${V(g, b, "VALUE") || 0};\n`,
  remove_item: (g, b) => { const n = fv(b, "LIST"); return `${n}.erase(${n}.begin() + (int) (${V(g, b, "INDEX") || 0}));\n`; },
  sort_list: (g, b) => { const n = fv(b, "LIST"); return `sort(${n}.begin(), ${n}.end()${fv(b, "ORDER") === "descending" ? ", greater<>()" : ""});\n`; },
  contains_block: (g, b) => { const n = fv(b, "LIST"), x = V(g, b, "ITEM", 0) || 0; return [(g.vt[n] || [])[0] === "String" ? `${n}.find(${x}) != string::npos` : `find(${n}.begin(), ${n}.end(), ${x}) != ${n}.end()`, 1]; },
  for_each_block: (g, b) => `for (auto ${fv(b, "VAR")} : ${fv(b, "LIST")}) {\n${body(g, b, "DO", true)}}\n`,
  define_function_block: (g, b) => { F.define_function_block(g, b, true); g.funcs.push(g.funcs.pop().replace(/^    static /, "").replace(/\bString\b/g, "string").replace(/\bboolean\b/g, "bool")); return ""; }
};
for (const [name, fn] of Object.entries(F)) gens.cpp.forBlock[name] = (b, g) => (CPP[name] || fn)(g, b, true);
const JS = {
  input_block: () => ["rl()", 0],
  print_block: (g, b) => `console.log(${V(g, b, "VALUE") || '""'});\n`,
  print_inline_block: (g, b) => `process.stdout.write(String(${V(g, b, "VALUE") || '""'}));\n`,
  input_number_block: (g, b) => [fv(b, "TYPE") === "int" ? "parseInt(rl(), 10)" : "parseFloat(rl())", 0],
  comparison_block: (g, b) => { const o = fv(b, "OP"); return [`${V(g, b, "LEFT", 0) || 0} ${o === "==" ? "===" : o === "!=" ? "!==" : o} ${V(g, b, "RIGHT", 0) || 0}`, 1]; },
  repeat_block: (g, b) => { const t = V(g, b, "TIMES") || 0, d = body(g, b, "DO", true), i = "_i" + (g.n = (g.n || 0) + 1); return `for (let ${i} = 0; ${i} < ${t}; ${i}++) {\n${d}}\n`; },
  for_block: (g, b) => { const v = fv(b, "VAR"), a = V(g, b, "FROM") || 0, t = V(g, b, "TO") || 0; return `for (let ${v} = ${a}; ${v} < ${t}; ${v}++) {\n${body(g, b, "DO", true)}}\n`; },
  for_each_block: (g, b) => `for (let ${fv(b, "VAR")} of ${fv(b, "LIST")}) {\n${body(g, b, "DO", true)}}\n`,
  text_join_block: (g, b) => { const f = n => { const c = b.getInputTargetBlock(n), x = V(g, b, n, 0) || '""'; return c && STRT.includes(c.type) ? x : `String(${x})`; }; return [`${f("LEFT")} + ${f("RIGHT")}`, 1]; },
  to_text_block: (g, b) => [`String(${V(g, b, "VALUE") || 0})`, 0],
  length_block: (g, b) => [`${V(g, b, "VALUE", 0) || '""'}.length`, 0],
  math_func_block: (g, b) => { const f = fv(b, "FUNC"), x = V(g, b, "VALUE") || 0; return [f === "int" ? `Math.trunc(${x})` : f === "float" ? `Number(${x})` : `Math.${f}(${x})`, 0]; },
  random_block: (g, b) => { const a = V(g, b, "FROM") || 0, t = V(g, b, "TO") || 0; return [`(Math.floor(Math.random() * ((${t}) - (${a}) + 1)) + (${a}))`, 0]; },
  create_list: (g, b) => { const n = fv(b, "LIST"); dec(g, n, "list", "[]"); return `${n} = [];\n`; },
  add_to_list: (g, b) => { const n = fv(b, "LIST"); dec(g, n, "list", "[]"); return `${n}.push(${V(g, b, "ITEM") || 0});\n`; },
  get_item: (g, b) => [`${fv(b, "LIST")}[Math.trunc(${V(g, b, "INDEX") || 0})]`, 0],
  set_item: (g, b) => `${fv(b, "LIST")}[Math.trunc(${V(g, b, "INDEX") || 0})] = ${V(g, b, "VALUE") || 0};\n`,
  remove_item: (g, b) => `${fv(b, "LIST")}.splice(Math.trunc(${V(g, b, "INDEX") || 0}), 1);\n`,
  sort_list: (g, b) => `${fv(b, "LIST")}.sort((a, b) => a < b ? ${fv(b, "ORDER") === "descending" ? "1 : a > b ? -1" : "-1 : a > b ? 1"} : 0);\n`,
  contains_block: (g, b) => [`${fv(b, "LIST")}.includes(${V(g, b, "ITEM", 0) || 0})`, 0],
  define_function_block: (g, b) => {
    const n = fv(b, "NAME"), ps = fv(b, "PARAMS").split(",").map(s => s.trim().split(":")[0].trim()).filter(Boolean);
    const saved = g.vt; g.vt = {}; ps.forEach(p => g.vt[p] = ["double", ""]);
    const d = body(g, b, "BODY", true), loc = g.vt; g.vt = saved;
    const decl = Object.entries(loc).filter(([k]) => !ps.includes(k)).map(([k, [t, i]]) => `    let ${k} = ${i};\n`).join("");
    g.funcs.push(`function ${n}(${ps.join(", ")}) {\n${decl}${d}}\n`); return "";
  }
};
for (const [name, fn] of Object.entries(F)) gens.js.forBlock[name] = (b, g) => (JS[name] || fn)(g, b, true);


gens.python.init = gens.java.init = gens.cpp.init = gens.js.init = function (w) {
  this.vt = {}; this.n = 0; this.rand = 0; this.imp = new Set(); this.funcs = []; this.fn = {};
  w.getAllBlocks(false).forEach(b => { if (b.type === "define_function_block") this.fn[b.getFieldValue("NAME")] = { t: { text: "String", boolean: "boolean", number: "double" }[b.getFieldValue("RET")] || "void" }; });
};
gens.python.finish = function (code) { const im = [...this.imp].map(m => `import ${m}\n`).join(""); return im + (im ? "\n" : "") + this.funcs.join("\n") + (this.funcs.length ? "\n" : "") + code; };
gens.java.finish = function (code) {
  const decl = Object.entries(this.vt).map(([n, [t, i]]) => `        ${t} ${n} = ${i};`).join("\n");
  const main = code.split("\n").map(l => l && "        " + l).join("\n");
  return `import java.util.*;\n\npublic class Main {\n    static Scanner sc = new Scanner(System.in);\n${this.funcs.join("\n")}${this.funcs.length ? "\n" : ""}    public static void main(String[] args) {\n${decl}\n${main}\n    }\n}\n`;
};

gens.cpp.finish = function (code) {
  const decl = Object.entries(this.vt).map(([n, [t, i]]) => `    ${CT(t)} ${n} = ${i};`).join("\n");
  const main = code.split("\n").map(l => l && "    " + l).join("\n");
  return `#include <bits/stdc++.h>\nusing namespace std;\n\nstatic string rl() { string s; getline(cin, s); return s; }\n\n${this.funcs.join("\n")}${this.funcs.length ? "\n" : ""}int main() {\n${this.rand ? "    srand(time(0));\n" : ""}${decl}\n${main}\n    return 0;\n}\n`;
};

gens.js.finish = function (code) {
  const decl = Object.entries(this.vt).map(([n, [t, i]]) => `let ${n} = ${i};`).join("\n");
  return `const _L = require("fs").readFileSync(0, "utf8").split("\\n");\nlet _p = 0;\nconst rl = () => _L[_p++] ?? "";\n\n${this.funcs.join("\n")}${this.funcs.length ? "\n" : ""}${decl}${decl ? "\n" : ""}${code}`;
};

/* ---------- workspace ---------- */
function toolbox() {
  const cat = (name, colour, types) => ({ kind: "category", name, colour, contents: types.map(type => ({ kind: "block", type })) });
  return { kind: "categoryToolbox", contents: [
    cat("Basic", C.io, ["text_block", "number_block", "input_block", "input_number_block", "print_block", "print_inline_block"]),
    cat("Variables", C.v, ["create_variable", "set_variable", "change_variable", "math_assign_block", "get_variable"]),
    cat("Math", C.num, ["math_block", "math_func_block", "min_max_block", "random_block"]),
    cat("Logic", C.logic, ["comparison_block", "and_block", "or_block", "not_block", "boolean_block", "if_block", "if_else_block"]),
    cat("Loops", C.loop, ["repeat_block", "while_block", "for_block", "for_each_block", "break_block", "continue_block"]),
    cat("Lists", C.list, ["create_list", "add_to_list", "get_item", "set_item", "remove_item", "contains_block", "sort_list"]),
    cat("Text", C.text, ["text_join_block", "to_text_block", "length_block"]),
    cat("Functions", C.func, ["define_function_block", "return_block", "call_block", "call_value_block"]),
    cat("Other", 0, ["buffer_block"])
  ] };
}
function initBlockly() {
  const theme = Blockly.Theme.defineTheme("py2dark", { base: Blockly.Themes.Zelos, name: "py2dark", fontStyle: { family: "Nunito, sans-serif", weight: "800", size: 12 }, componentStyles: {
    workspaceBackgroundColour: "transparent", toolboxBackgroundColour: "#161b22", toolboxForegroundColour: "#c9d1d9",
    flyoutBackgroundColour: "#1c2128", flyoutForegroundColour: "#c9d1d9", flyoutOpacity: 1, scrollbarColour: "#30363d" } });
  ws = Blockly.inject("blocklyDiv", { toolbox: toolbox(), theme, renderer: "zelos", zoom: { controls: true, wheel: true }, grid: { spacing: 24, length: 2, colour: "#21262d", snap: true }, trashcan: true });
  ws.addChangeListener(e => { if (!loading && !e.isUiEvent) blocksToCode(); });
  window.addEventListener("resize", () => Blockly.svgResize(ws));
}
function blocksToCode() { $("code").value = gens[lang].workspaceToCode(ws); }

/* ---------- JSON -> blocks (auto-arranged) ---------- */
function build(n) {
  const b = ws.newBlock(n.type in Blockly.Blocks ? n.type : "buffer_block");
  if (b.type === "buffer_block" && n.type !== "buffer_block") { b.setFieldValue(n.type, "CODE"); b.setFieldValue("unknown block", "REASON"); }
  for (const [k, v] of Object.entries(n.fields || {})) try { b.setFieldValue(String(v), k); } catch {}
  for (const [k, c] of Object.entries(n.inputs || {})) { const i = b.getInput(k); if (i && c) i.connection.connect(build(c).outputConnection); }
  for (const [k, list] of Object.entries(n.statements || {})) { const i = b.getInput(k); if (i) chain(list, i.connection); }
  return b;
}
function chain(list, conn) {
  for (const n of list || []) { const b = build(n); if (!b.previousConnection) continue; conn.connect(b.previousConnection); conn = b.nextConnection; }
}
function showBlocks(nodes, keep) {
  loading = true; ws.clear();
  let prev = null;
  for (const n of nodes || []) {
    const b = build(n); if (!b.previousConnection) continue;
    if (prev) prev.nextConnection.connect(b.previousConnection);
    prev = b;
  }
  ws.getAllBlocks().forEach(b => { b.initSvg(); b.render(); });
  ws.cleanUp(); if (!keep) ws.scrollCenter(); loading = false; if (!keep) blocksToCode();
}

/* ---------- local Python code -> blocks (instant, no AI) ---------- */
function pyExpr(src) {
  const re = /\s*(\d+\.?\d*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|==|!=|>=|<=|\*\*|\/\/|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|[-+*\/%<>()\[\],])/y, t = [];
  let pos = 0, i = 0; const end = src.trimEnd().length;
  while (pos < end) { re.lastIndex = pos; const m = re.exec(src); if (!m) throw 0; t.push(m[1]); pos = re.lastIndex; }
  const peek = () => t[i], next = () => t[i++];
  const CMP = ["==", "!=", ">=", "<=", ">", "<"];
  const op = (o, l, r) => o === "and" || o === "or" ? { type: o + "_block", inputs: { LEFT: l, RIGHT: r } }
    : { type: CMP.includes(o) ? "comparison_block" : "math_block", fields: { OP: o }, inputs: { LEFT: l, RIGHT: r } };
  const lvl = (ops, sub) => () => { let l = sub(); while (ops.includes(peek())) { const o = next(); l = op(o, l, sub()); } return l; };
  const call = (f, a) => {
    const n = a.length, v = a[0];
    if ((f === "int" || f === "float") && n === 1 && v.type === "input_block") return { type: "input_number_block", fields: { TYPE: f } };
    if (["abs", "round", "int", "float"].includes(f) && n === 1) return { type: "math_func_block", fields: { FUNC: f }, inputs: { VALUE: v } };
    if (["math.sqrt", "math.floor", "math.ceil"].includes(f) && n === 1) return { type: "math_func_block", fields: { FUNC: f.slice(5) }, inputs: { VALUE: v } };
    if (f === "str" && n === 1) return { type: "to_text_block", inputs: { VALUE: v } };
    if (f === "len" && n === 1) return { type: "length_block", inputs: { VALUE: v } };
    if (f === "random.randint" && n === 2) return { type: "random_block", inputs: { FROM: a[0], TO: a[1] } };
    if ((f === "min" || f === "max") && n === 2) return { type: "min_max_block", fields: { FUNC: f }, inputs: { LEFT: a[0], RIGHT: a[1] } };
    if (/^\w+$/.test(f) && n <= 4) return { type: "call_value_block", fields: { NAME: f }, inputs: Object.fromEntries(a.map((e, i) => ["ARG" + (i + 1), e])) };
    throw 0;
  };
  function atom() {
    const x = next(); if (x === undefined) throw 0;
    if (/^\d/.test(x)) return { type: "number_block", fields: { NUMBER: x } };
    if (x[0] === '"' || x[0] === "'") return { type: "text_block", fields: { TEXT: x.slice(1, -1) } };
    if (x === "(") { const e = orE(); if (next() !== ")") throw 0; return e; }
    if (x === "-" && /^\d/.test(peek() || "")) return { type: "number_block", fields: { NUMBER: "-" + next() } };
    if (/^[A-Za-z_]/.test(x)) {
      if (x === "True" || x === "False") return { type: "boolean_block", fields: { BOOL: x } };
      if (["and", "or", "not"].includes(x)) throw 0;
      if (x === "input" && peek() === "(") { next(); if (next() !== ")") throw 0; return { type: "input_block" }; }
      if (peek() === "[") { next(); const e = orE(); if (next() !== "]") throw 0; return { type: "get_item", fields: { LIST: x }, inputs: { INDEX: e } }; }
      if (peek() === "(") { next(); const a = []; if (peek() !== ")") { a.push(orE()); while (peek() === ",") { next(); a.push(orE()); } } if (next() !== ")") throw 0; return call(x, a); }
      return { type: "get_variable", fields: { VAR: x } };
    }
    throw 0;
  }
  const powE = lvl(["**"], atom), mulE = lvl(["*", "/", "%", "//"], powE), addE = lvl(["+", "-"], mulE), cmpE = lvl(CMP, addE), inE = () => { const l = cmpE(); if (peek() === "in") { next(); const n = next(); if (!/^[A-Za-z_]\w*$/.test(n || "")) throw 0; return { type: "contains_block", fields: { LIST: n }, inputs: { ITEM: l } }; } return l; },
    notE = () => peek() === "not" ? (next(), { type: "not_block", inputs: { VALUE: notE() } }) : inE(), andE = lvl(["and"], notE), orE = lvl(["or"], andE);
  const r = orE(); if (i !== t.length) throw 0; return r;
}
const splitArgs = s => { const a = []; let d = 0, c = ""; for (const ch of s) { if ("([".includes(ch)) d++; if (")]".includes(ch)) d--; if (ch === "," && !d) { a.push(c); c = ""; } else c += ch; } a.push(c); return a; };
function pyBlocks(code) {
  const L = code.replace(/\t/g, "    ").split("\n").map(r => ({ ind: r.search(/\S/), s: r.trim() })).filter(l => l.s && !l.s.startsWith("#") && !/^import (math|random)$/.test(l.s));
  let p = 0;
  const buf = s => ({ type: "buffer_block", fields: { CODE: s, REASON: "no block for this yet" } });
  const block = ind => { const out = []; while (p < L.length && L[p].ind >= ind) out.push(stmt()); return out; };
  const body = ind => p < L.length && L[p].ind > ind ? block(L[p].ind) : [];
  function ifS(ind, cond) {
    const c = pyExpr(cond), d = body(ind);
    if (p < L.length && L[p].ind === ind && L[p].s === "else:") { p++; return { type: "if_else_block", inputs: { CONDITION: c }, statements: { DO: d, ELSE: body(ind) } }; }
    const m = p < L.length && L[p].ind === ind && L[p].s.match(/^elif (.+):$/);
    if (m) { p++; return { type: "if_else_block", inputs: { CONDITION: c }, statements: { DO: d, ELSE: [ifS(ind, m[1])] } }; }
    return { type: "if_block", inputs: { CONDITION: c }, statements: { DO: d } };
  }
  function stmt() {
    const start = p, { ind, s } = L[p++]; let m;
    try {
      if ((m = s.match(/^if (.+):$/))) return ifS(ind, m[1]);
      if ((m = s.match(/^while (.+):$/))) { const c = pyExpr(m[1]); return { type: "while_block", inputs: { CONDITION: c }, statements: { DO: body(ind) } }; }
      if ((m = s.match(/^for (\w+) in range\((.+)\):$/))) {
        const a = splitArgs(m[2]).map(pyExpr); if (a.length > 2) throw 0;
        if (m[1] === "_" && a.length === 1) return { type: "repeat_block", inputs: { TIMES: a[0] }, statements: { DO: body(ind) } };
        const inputs = a.length === 1 ? { FROM: { type: "number_block", fields: { NUMBER: "0" } }, TO: a[0] } : { FROM: a[0], TO: a[1] };
        return { type: "for_block", fields: { VAR: m[1] }, inputs, statements: { DO: body(ind) } };
      }
      if ((m = s.match(/^print\((.*)\)$/))) {
        const a = splitArgs(m[1]).map(x => x.trim()); let inline = false;
        if (a.length > 1 && /^end\s*=\s*(""|'')$/.test(a[a.length - 1])) { inline = true; a.pop(); }
        if (a.some(x => /^\w+\s*=[^=]/.test(x))) throw 0;
        const ns = a.map(pyExpr); let v = ns[0];
        for (let k = 1; k < ns.length; k++) v = { type: "text_join_block", inputs: { LEFT: { type: "text_join_block", inputs: { LEFT: v, RIGHT: { type: "text_block", fields: { TEXT: " " } } } }, RIGHT: ns[k] } };
        return { type: inline ? "print_inline_block" : "print_block", inputs: { VALUE: v } };
      }
      if ((m = s.match(/^def (\w+)\(([^)]*)\):$/))) {
        const ps = m[2].split(",").map(x => x.trim()).filter(Boolean); if (ps.some(x => !/^\w+$/.test(x))) throw 0;
        const d = body(ind), rets = []; const scan = ns => ns.forEach(n => { if (n.type === "return_block" && n.inputs) rets.push(n.inputs.VALUE); Object.values(n.statements || {}).forEach(scan); }); scan(d);
        const r = rets[0], T = ["text_block", "text_join_block", "to_text_block", "input_block"], B = ["comparison_block", "boolean_block", "and_block", "or_block", "not_block", "contains_block"];
        return { type: "define_function_block", fields: { NAME: m[1], PARAMS: ps.join(", "), RET: !rets.length ? "nothing" : T.includes(r.type) ? "text" : B.includes(r.type) ? "boolean" : "number" }, statements: { BODY: d } };
      }
      if ((m = s.match(/^return(?: (.+))?$/))) return { type: "return_block", inputs: m[1] ? { VALUE: pyExpr(m[1]) } : {} };
      if (s === "break") return { type: "break_block" };
      if (s === "continue") return { type: "continue_block" };
      if ((m = s.match(/^for (\w+) in (\w+):$/))) return { type: "for_each_block", fields: { VAR: m[1], LIST: m[2] }, statements: { DO: body(ind) } };
      if ((m = s.match(/^(\w+)\[(.+)\]\s*=\s*(?!=)(.+)$/))) return { type: "set_item", fields: { LIST: m[1] }, inputs: { INDEX: pyExpr(m[2]), VALUE: pyExpr(m[3]) } };
      if ((m = s.match(/^(\w+)\.pop\((.+)\)$/))) return { type: "remove_item", fields: { LIST: m[1] }, inputs: { INDEX: pyExpr(m[2]) } };
      if ((m = s.match(/^(\w+)\.sort\((reverse=(True|False))?\)$/))) return { type: "sort_list", fields: { LIST: m[1], ORDER: m[3] === "True" ? "descending" : "ascending" } };
      if ((m = s.match(/^(\w+)\s*([-*\/%])=\s*(.+)$/))) return { type: "math_assign_block", fields: { VAR: m[1], OP: m[2] + "=" }, inputs: { VALUE: pyExpr(m[3]) } };
      if ((m = s.match(/^(\w+)\s*=\s*\[\]$/))) return { type: "create_list", fields: { LIST: m[1] } };
      if ((m = s.match(/^(\w+)\s*=\s*None$/))) return { type: "create_variable", fields: { VAR: m[1] } };
      if ((m = s.match(/^(\w+)\s*=\s*(?!=)(.+)$/))) return { type: "set_variable", fields: { VAR: m[1] }, inputs: { VALUE: pyExpr(m[2]) } };
      if ((m = s.match(/^(\w+)\s*\+=\s*(.+)$/))) return { type: "change_variable", fields: { VAR: m[1] }, inputs: { VALUE: pyExpr(m[2]) } };
      if ((m = s.match(/^(\w+)\.append\((.+)\)$/))) return { type: "add_to_list", fields: { LIST: m[1] }, inputs: { ITEM: pyExpr(m[2]) } };
      if ((m = s.match(/^(\w+)\((.*)\)$/))) { const a = splitArgs(m[2]).filter(x => x.trim()); if (a.length > 4) throw 0; return { type: "call_block", fields: { NAME: m[1] }, inputs: Object.fromEntries(a.map((e, i) => ["ARG" + (i + 1), pyExpr(e)])) }; }
      throw 0;
    } catch (e) {
      if (typeof e !== "number") throw e;
      p = start + 1; const lines = [s];
      if (s.endsWith(":")) while (p < L.length && L[p].ind > ind) { lines.push(" ".repeat(L[p].ind - ind) + L[p].s); p++; }
      return buf(lines.join("\n"));
    }
  }
  const out = []; while (p < L.length) out.push(stmt()); return out;
}

/* ---------- local Java / C++ / JavaScript code -> blocks (instant, no AI): translate to Python, then reuse pyBlocks ---------- */
function balEnd(s, i) { // s[i] is "(" or "["; returns index of its matching close, or -1
  let d = 0, q = null;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === "(" || c === "[") d++;
    else if (c === ")" || c === "]") { if (--d === 0) return k; }
  }
  return -1;
}
function rcalls(s, re, fn) { // re must end with "(" ; fn(inner, match) returns the replacement, or null to leave it
  const g = new RegExp(re.source, "g");
  for (let n = 0; n < 200; n++) {
    let m, changed = false; g.lastIndex = 0;
    while ((m = g.exec(s))) {
      const open = m.index + m[0].length - 1, close = balEnd(s, open); if (close < 0) continue;
      const rep = fn(s.slice(open + 1, close), m); if (rep == null) continue;
      s = s.slice(0, m.index) + rep + s.slice(close + 1); changed = true; break;
    }
    if (!changed) return s;
  }
  return s;
}
function splitTop(s, sep) {
  const a = []; let d = 0, q = null, c0 = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { c0 += c; if (c === "\\") c0 += s[++i] ?? ""; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; c0 += c; continue; }
    if ("([".includes(c)) d++; if (")]".includes(c)) d--;
    if (!d && s.startsWith(sep, i)) { a.push(c0); c0 = ""; i += sep.length - 1; } else c0 += c;
  }
  a.push(c0); return a.map(x => x.trim());
}
const unwrap = (x, f) => x.startsWith(f + "(") && balEnd(x, f.length) === x.length - 1 ? x.slice(f.length + 1, -1) : x;
function lenFix(s) {
  for (let g = 0; g < 50; g++) {
    const m = /\.(?:size|length)\(\)/.exec(s); if (!m) break;
    const j = m.index; let st = j;
    if (s[j - 1] === ")") { let d = 0, k = j - 1; for (; k >= 0; k--) { if (s[k] === ")") d++; else if (s[k] === "(" && --d === 0) break; } st = Math.max(k, 0); while (st > 0 && /[\w.]/.test(s[st - 1])) st--; }
    else while (st > 0 && /[\w\u0001\u0002]/.test(s[st - 1])) st--;
    s = s.slice(0, st) + "len(" + s.slice(st, j) + ")" + s.slice(j + m[0].length);
  }
  return s;
}
function cRandom(s) {
  const ta = (g, pre) => {
    if (!g.startsWith(pre + "(")) return; let e = balEnd(g, pre.length); if (e < 0) return;
    const T = g.slice(pre.length + 1, e), mid = " - " + pre, p = e + 1; if (!g.startsWith(mid + "(", p)) return;
    const q = p + mid.length; e = balEnd(g, q); if (e < 0 || g.slice(e + 1) !== " + 1") return;
    return [T, g.slice(q + 1, e)];
  };
  const specs = [
    { mark: "Math.random() * (", head: "((int) (", pre: "", mk: (T, A) => `((int) (Math.random() * ((${T}) - (${A}) + 1)) + ${A})` },
    { mark: "Math.random() * (", head: "(Math.floor(", pre: "", mk: (T, A) => `(Math.floor(Math.random() * ((${T}) - (${A}) + 1)) + (${A}))` },
    { mark: "rand() % (", head: "(", pre: "(int) ", mk: (T, A) => `(rand() % ((int) (${T}) - (int) (${A}) + 1) + (int) (${A}))` }
  ];
  for (let n = 0; n < 20; n++) {
    let hit = false;
    for (const sp of specs) {
      const idx = s.indexOf(sp.mark); if (idx < 0) continue;
      const g = idx + sp.mark.length - 1, ge = balEnd(s, g); if (ge < 0) continue;
      const r = ta(s.slice(g + 1, ge), sp.pre); if (!r) continue;
      const st = idx - sp.head.length, full = sp.mk(r[0], r[1]);
      if (st >= 0 && s.startsWith(full, st)) { s = s.slice(0, st) + `random.randint(${r[1]}, ${r[0]})` + s.slice(st + full.length); hit = true; break; }
    }
    if (!hit) break;
  }
  return s;
}
function cx(e) { // expression: Java / C++ / JavaScript -> Python text
  e = e.trim(); if (e === "{}") return "[]";
  const S = []; e = e.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, m => { S.push(m); return `\u0001${S.length - 1}\u0002`; });
  const A = x => splitTop(x, ",");
  e = e.replace(/Integer\.parseInt\(sc\.nextLine\(\)\.trim\(\)\)/g, "int(input())").replace(/Double\.parseDouble\(sc\.nextLine\(\)\.trim\(\)\)/g, "float(input())")
    .replace(/\bstoi\(rl\(\)\)/g, "int(input())").replace(/\bstod\(rl\(\)\)/g, "float(input())")
    .replace(/parseInt\(rl\(\), 10\)/g, "int(input())").replace(/parseFloat\(rl\(\)\)/g, "float(input())")
    .replace(/sc\.nextLine\(\)/g, "input()").replace(/\brl\(\)/g, "input()")
    .replace(/new\s+ArrayList<[^>]*>\(\)/g, "[]");
  e = cRandom(e);
  e = e.replace(/\(int\)\s*\(/g, "int(").replace(/\(double\)\s*\(/g, "float(").replace(/\((?:int|double)\)\s*/g, "");
  e = e.replace(/(?<![\w.])(?:Math\.)?(floor|sqrt|ceil)\(/g, "math.$1(").replace(/(?<![\w.])(?:Math\.abs|fabs)\(/g, "abs(").replace(/Math\.round\(/g, "round(")
    .replace(/Math\.trunc\(/g, "int(").replace(/(?<![\w.])Number\(/g, "float(").replace(/Math\.(min|max)\(/g, "$1(");
  e = rcalls(e, /(?<![\w.])(?:Math\.)?pow\(/, i => { const a = A(i); return a.length === 2 ? `(${a[0]} ** ${a[1]})` : null; });
  e = rcalls(e, /(?<![\w.])fmod\(/, i => { const a = A(i); return a.length === 2 ? `(${a[0]} % ${a[1]})` : null; });
  e = rcalls(e, /(?<![\w.])(min|max)\(/, (i, m) => { const a = A(i), b = a.map(x => unwrap(x, "float")); return b.join() === a.join() ? null : `${m[1]}(${b.join(", ")})`; });
  e = rcalls(e, /\[int\(/, i => "[" + i);
  e = rcalls(e, /\b(\w+)\.(?:get|charAt)\(/, (i, m) => `${m[1]}[${unwrap(i.trim(), "int")}]`);
  e = rcalls(e, /(?<![\w.])(?:String\.valueOf|to_string|String)\(/, i => /^\w+\[[\s\S]*\]$/.test(i.trim()) ? i : `str(${i})`);
  e = rcalls(e, /(?<![\w.:])string\(/, i => /^1,\s*/.test(i) ? i.replace(/^1,\s*/, "") : /^\u0001\d+\u0002$/.test(i.trim()) ? i.trim() : `str(${i})`);
  e = rcalls(e, /\b(\w+)\.(?:contains|includes)\(/, (i, m) => `(${i} in ${m[1]})`);
  e = rcalls(e, /(?<![\w.])find\(/, i => { const a = A(i); return a.length === 3 && a[0] === a[1].replace("end()", "begin()") && /^\w+\.begin\(\)$/.test(a[0]) ? `(${a[2]} in ${a[0].replace(".begin()", "")}) != X.end()` : null; });
  e = rcalls(e, /\b(\w+)\.find\(/, (i, m) => `(${i} in ${m[1]}) != string::npos`);
  e = e.replace(/ != (?:\w+|X)\.end\(\)/g, "").replace(/ != string::npos/g, "");
  e = lenFix(e).replace(/([\w\u0001\u0002]+)\.length\b(?!\()/g, "len($1)");
  e = e.replace(/===/g, "==").replace(/!==/g, "!=").replace(/&&/g, " and ").replace(/\|\|/g, " or ").replace(/!(?!=)/g, "not ")
    .replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\b(?:null|nullptr)\b/g, "None");
  return e.replace(/\s{2,}/g, " ").replace(/\u0001(\d+)\u0002/g, (_, n) => S[n]).trim();
}
const CTYPE = "(?:final\\s+)?(?:int|long|short|double|float|boolean|bool|char|String|string|auto|var|let|const|Object|(?:ArrayList|List|vector)<[^;=]*?>)";
const DEFAULT_INIT = /^(?:0|0\.0|""|false|null|\{\}|\[\]|new\s+ArrayList<[^>]*>\(\)|vector<[^>]*>\(\))$/;
function cStmt(s, top) {
  s = s.trim(); let m; const ok = py => ({ py });
  if (!s || /^(?:import\s|package\s|using\s|static\s+Scanner|static\s+string\s+rl|const\s+_L\b|let\s+_p\b|const\s+rl\b|srand\()/.test(s)) return null;
  if (top && top.k === "main" && /^return\s+0$/.test(s)) return null;
  if ((m = s.match(/^System\.out\.println\(([\s\S]*)\)$/)) || (m = s.match(/^console\.log\(([\s\S]*)\)$/))) return ok(`print(${cx(m[1]) || '""'})`);
  if ((m = s.match(/^System\.out\.print\(([\s\S]*)\)$/)) || (m = s.match(/^process\.stdout\.write\(([\s\S]*)\)$/))) return ok(`print(${cx(unwrap(m[1].trim(), "String"))}, end="")`);
  if ((m = s.match(/^(?:std::)?cout\s*<<([\s\S]*)$/))) {
    const p = splitTop(m[1], "<<"); const nl = /^(?:std::)?endl$/.test(p[p.length - 1]); if (nl) p.pop();
    const v = p.map(x => cx(x)).map((x, i) => p.length > 1 && !/^["']/.test(x) ? `str(${x})` : x).join(" + ");
    return ok(nl ? `print(${v || '""'})` : `print(${v}, end="")`);
  }
  if ((m = s.match(/^(\w+)(\+\+|--)$/))) return ok(`${m[1]} ${m[2] === "++" ? "+" : "-"}= 1`);
  if ((m = s.match(/^(\w+)\.clear\(\)$/))) return ok(`${m[1]} = []`);
  if ((m = s.match(/^(\w+)\.(?:add|push_back|push)\(([\s\S]*)\)$/))) return ok(`${m[1]}.append(${cx(m[2])})`);
  if ((m = s.match(/^(\w+)\.set\(([\s\S]*)\)$/))) { const a = splitTop(m[2], ","); if (a.length === 2) return ok(`${m[1]}[${unwrap(cx(a[0]), "int")}] = ${cx(a[1])}`); }
  if ((m = s.match(/^(\w+)\.erase\(\1\.begin\(\) \+ ([\s\S]*)\)$/)) || (m = s.match(/^(\w+)\.remove\(([\s\S]*)\)$/))) return ok(`${m[1]}.pop(${unwrap(cx(m[2]), "int")})`);
  if ((m = s.match(/^(\w+)\.splice\(([\s\S]*), 1\)$/))) return ok(`${m[1]}.pop(${unwrap(cx(m[2]), "int")})`);
  if ((m = s.match(/^(\w+)\.sort\((null|Collections\.reverseOrder\(\))\)$/))) return ok(`${m[1]}.sort(${m[2] === "null" ? "" : "reverse=True"})`);
  if ((m = s.match(/^sort\((\w+)\.begin\(\), \1\.end\(\)(, greater<>\(\))?\)$/))) return ok(`${m[1]}.sort(${m[2] ? "reverse=True" : ""})`);
  if ((m = s.match(/^(\w+)\.sort\(\(a, b\) => a < b \? (-?1) : a > b \? (-?1) : 0\)$/))) return ok(`${m[1]}.sort(${m[2] === "-1" ? "" : "reverse=True"})`);
  if ((m = s.match(/^return\b([\s\S]*)$/))) return ok(`return${m[1].trim() ? " " + cx(m[1]) : ""}`);
  if (s === "break" || s === "continue") return ok(s);
  if ((m = s.match(new RegExp(`^${CTYPE}\\s+(\\w+)\\s*(?:=\\s*([\\s\\S]+))?$`)))) {
    const init = (m[2] || "").trim();
    if (!init || DEFAULT_INIT.test(init)) return { py: `${m[1]} = ${init ? cx(init) : "None"}`, decl: true, def: true };
    return { py: `${m[1]} = ${cx(init)}`, decl: true };
  }
  if ((m = s.match(/^(\w+)\[([\s\S]+?)\]\s*=\s*(?!=)([\s\S]+)$/))) return ok(`${m[1]}[${unwrap(cx(m[2]), "int")}] = ${cx(m[3])}`);
  if ((m = s.match(/^(\w+)\s*(=|[-+*\/%]=)\s*(?!=)([\s\S]+)$/))) return ok(`${m[1]} ${m[2]} ${cx(m[3])}`);
  return ok(cx(s));
}
function cHeader(h) {
  let m; const py = line => ({ k: "py", py: line });
  if (/^(?:public\s+)?(?:final\s+)?class\b/.test(h)) return { k: "class" };
  if (/\bmain\s*\(/.test(h)) return { k: "main" };
  if (/^static\s+string\s+rl\s*\(/.test(h)) return { k: "skip" };
  if ((m = h.match(/^else\s+if\s*\(([\s\S]*)\)$/))) return py(`elif ${cx(m[1])}:`);
  if (h === "else") return py("else:");
  if ((m = h.match(/^if\s*\(([\s\S]*)\)$/))) return py(`if ${cx(m[1])}:`);
  if ((m = h.match(/^while\s*\(([\s\S]*)\)$/))) return py(`while ${cx(m[1])}:`);
  if ((m = h.match(/^for\s*\(([\s\S]*)\)$/))) {
    const inner = m[1], f = splitTop(inner, ";");
    if (f.length === 3) {
      const a = f[0].match(/^(?:\w+\s+)?(\w+)\s*=\s*([\s\S]+)$/), c = a && f[1].match(new RegExp(`^${a[1]}\\s*(<=|<)\\s*([\\s\\S]+)$`)), inc = a && new RegExp(`^(?:${a[1]}\\+\\+|\\+\\+${a[1]})$`).test(f[2]);
      if (a && c && inc) {
        const from = cx(a[2]), to = cx(c[2]) + (c[1] === "<=" ? " + 1" : "");
        return py(a[1].startsWith("_i") && from === "0" ? `for _ in range(${to}):` : `for ${a[1]} in range(${from}, ${to}):`);
      }
    } else if ((m = inner.match(/^(?:[\w:]+(?:<[^>]*>)?[&*]?\s+)*(\w+)\s*(?::|\bof\b)\s*(\w+)$/))) return py(`for ${m[1]} in ${m[2]}:`);
    return py(`for (${inner}):`);
  }
  if ((m = h.match(/^function\s+(\w+)\s*\(([\s\S]*)\)$/)) || (m = h.match(/^(?:static\s+)?(?:void|int|long|double|float|bool|boolean|string|String|auto|vector<[^>]*>)\s+(\w+)\s*\(([\s\S]*)\)$/))) {
    const ps = splitTop(m[2], ",").map(x => (x.replace(/[&*]/g, "").match(/(\w+)\s*$/) || [])[1]).filter(Boolean);
    return py(`def ${m[1]}(${ps.join(", ")}):`);
  }
  return py(`${h}:`);
}
function ctoks(src) {
  const out = []; let cur = "", d = 0, q = null, bi = 0;
  const stmt = () => { const s = cur.trim(); cur = ""; if (s) out.push({ t: "stmt", s }); };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { cur += c; if (c === "\\") cur += src[++i] ?? ""; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; cur += c; continue; }
    if (c === "/" && src[i + 1] === "/") {
      let e = src.indexOf("\n", i); if (e < 0) e = src.length;
      const m = src.slice(i + 2, e).trim().match(/^unsupported: ([\s\S]*)$/); if (m) { stmt(); out.push({ t: "stmt", s: "\u0000" + m[1] }); }
      i = e - 1; continue;
    }
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 1; continue; }
    if (c === "#" && !cur.trim()) { const e = src.indexOf("\n", i); i = e < 0 ? src.length : e; continue; }
    if ("([".includes(c)) d++; else if (")]".includes(c)) d--;
    if (d <= 0 && c === ";") { stmt(); continue; }
    if (d <= 0 && c === "{") { if (/=\s*$/.test(cur)) { bi++; cur += c; continue; } const s = cur.trim(); cur = ""; out.push({ t: "open", s }); continue; }
    if (d <= 0 && c === "}") { if (bi > 0) { bi--; cur += c; continue; } stmt(); out.push({ t: "close" }); continue; }
    cur += c;
  }
  stmt(); return out;
}
function cToPy(code) {
  const out = [], st = [{ k: "root", zone: true }];
  const skipping = () => st.some(f => f.k === "skip"), ind = () => "    ".repeat(st.filter(f => f.k === "py").length);
  for (const t of ctoks(code)) {
    const top = st[st.length - 1];
    if (t.t === "open") { if (skipping()) { st.push({ k: "skip" }); continue; } const h = cHeader(t.s); if (h.k === "py") out.push(ind() + h.py); st.push({ k: h.k, zone: true }); }
    else if (t.t === "close") { if (st.length > 1) st.pop(); }
    else if (!skipping()) {
      if (t.s[0] === "\u0000") { top.zone = false; out.push(ind() + t.s.slice(1)); continue; }
      const r = cStmt(t.s, top); if (!r) continue;
      if (r.def && top.zone) continue;
      top.zone = false; out.push(ind() + r.py);
    }
  }
  return out.join("\n");
}

const codeToBlocks = code => pyBlocks(lang === "python" ? code : cToPy(code));

/* ---------- actions ---------- */
document.querySelectorAll(".seg button").forEach(btn => btn.onclick = () => {
  lang = btn.dataset.lang;
  document.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x === btn));
  blocksToCode(); status(`Switched to ${{ python: "Python", java: "Java", cpp: "C++", js: "JavaScript" }[lang]}`);
});
$("tidy").onclick = () => ws.cleanUp();
async function toBlocks(payload, msg) {
  const btn = $("gen"), label = btn.textContent; btn.textContent = "Thinking..."; btn.disabled = true;
  try {
    const i = await api("info"); status(i.model ? `${i.model} (API key ${i.key}) is thinking...` : msg);
    const r = await api("generate", { ...payload, lang });
    if (r.timeout || !r.blocks) return status(r.error || "The AI could not finish. Check your API keys in .env and try again.");
    showBlocks(r.blocks, !!payload.code); status(`Done by ${r.model || "the AI"} (API key ${r.key})`);
  } finally { btn.textContent = label; btn.disabled = false; }
}
$("gen").onclick = () => $("prompt").value.trim() && toBlocks({ prompt: $("prompt").value }, "The AI is thinking...");
$("prompt").onkeydown = e => { if (e.key === "Enter") $("gen").click(); };
$("code").oninput = () => {
  clearTimeout(typingTimer);
  const code = $("code").value;
  if (!code.trim()) return;
  typingTimer = setTimeout(() => { try { showBlocks(codeToBlocks(code), true); status("Blocks updated from your code"); } catch (e) { status("Could not read this code as blocks yet"); } }, 500);
};

/* ---------- run (local) + input/output toggle ---------- */
const show = (o, bad) => { $("out").textContent = o; $("out").classList.toggle("bad", !!bad); };
function pane(p) {
  document.querySelectorAll(".iotabs button").forEach(x => x.classList.toggle("on", x.dataset.pane === p));
  $("stdin").hidden = p !== "in"; $("out").hidden = p !== "out";
}
document.querySelectorAll(".iotabs button").forEach(t => t.onclick = () => pane(t.dataset.pane));
async function run() {
  pane("out"); show("Running on your computer..."); status("Running");
  const r = await api("manual", { code: $("code").value, lang, stdin: $("stdin").value });
  const text = (r.output || "") + (r.error ? (r.output ? "\n" : "") + r.error : "");
  show(text || "(no output)", !!r.error); status("Run finished");
}
$("run").onclick = run;
if (token) showApp();
