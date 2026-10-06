const is_browser = (typeof window !== 'undefined');

function create_packing(root_url) {
	root_url = root_url || "";
	console.log("root_url ", root_url);
  let is_browser = (typeof window !== 'undefined');
  const guidi = (function () {
    let guidCounter = 0;
    return function () {
      return (Date.now() + guidCounter++);
    }
  })();
  const each = function (callback, index) {
    const func = function (index) {
      callback(func, index);
    };
    func(index || 0);
  };
  function arguments_to_array(args) {
    let arr = [];
    args = args || [];
    for (let i = 0; i < args.length; i++) {
      arr.push(args[i]);
    }    

    return arr;

  };

  const sleep = function (ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }
  const is_function = function (obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  const is_string = function (x) {
    return Object.prototype.toString.call(x) === "[object String]"
  };

  const is_object = function (x) {
    return Object.prototype.toString.call(x).toLocaleLowerCase() === '[object object]'
  };
	let _require = function () { return null; };

	if (typeof require != 'undefined') {
		_require = require;
	}

  const http = _require('http');
  const https = _require('https');
  const fs = _require('fs');
  const path = _require('path');

  let get_file;


	let str_to_base64, base64_to_str;

	if (is_browser) {
		const url_types = {
			undefined: "text",
			"text": "text",
			"arraybuffer": "arraybuffer",
			"blob": "blob",
			"base64": "blob"
		}

		str_to_base64 = btoa;
		base64_to_str = atob;


		get_file = function (url, type, post_data, content_type) {
			url = url.replace("HOSTNAME", window.location.hostname);
			console.log("url", url);
			return new Promise(function (resolve) {
				const xtp = new XMLHttpRequest();
				xtp.onload = function () {
					resolve(this.response);
					this.abort();
				};
				xtp.onerror = function () {
					console.log("onerror", this.response);
				};

				xtp.responseType = url_types[type];
				if (post_data) {
					xtp.open("POST", url, !0);
					if (content_type)
						xtp.setRequestHeader('Content-Type', content_type);
					else {
						xtp.setRequestHeader('Content-Type', 'application/octet-stream');
					}
					xtp.send(post_data);
				}
				else {
					xtp.open("GET", url, true);
					xtp.send();
				}


			});
		};
	}
	else {
		const fs_types = {
			undefined: "utf8",
			"text": "utf8",
			"arraybuffer": "binary",
			"blob": "binary",
			"base64": "base64"
		}
		str_to_base64 = function (v) {
			return Buffer.from(v, "ascii").toString("base64");
		};

		base64_to_str = function (v) {
			return Buffer.from(v, "base64").toString("utf8");
		};
		get_file = function (url, type) {
			return new Promise(function (resolve) {
				url = url.trim();
				//console.log("get_file", url);
				if (url.indexOf('http://') == 0) {
					http.get(url, res => {
						let data = [];
						res.on('data', chunk => {
							data.push(chunk);
						});
						res.on('end', () => {
							resolve(Buffer.concat(data).toString(fs_types[type]));
						});
					});
				}
				else if (url.indexOf('https://') == 0) {
					https.get(url, res => {
						let data = [];
						res.on('data', chunk => {
							data.push(chunk);
						});
						res.on('end', () => {
							resolve(Buffer.concat(data).toString(fs_types[type]));
						});
					});
				}
				else {
					if (url.indexOf(root_url) < 0 && !fs.existsSync(url)) url = path.join(root_url, url);
					if (fs.existsSync(url)) {
						resolve(fs.readFileSync(url, {
							encoding: fs_types[type]
						}));
					}
					else {
						console.log("url not found", url);
						resolve("Error not found", url)
					}
				}
			});
		};
	}

	const test_dep_js = /[\s\S]*?.*\.js/;

  const loaded = {}, urlsnames = {}, cache = {}, keywords = {}, loading = {}, source_compilers = [], registry = {}, globals = {}, on_bundle = [];
  let last_url = root_url;
  const compilers = {};

  loaded[true] = false;

  function empty_object(obj) {
    const dbj = {};
    Object.keys(obj).forEach(function (k) {
      dbj[k] = obj[k];
      delete obj[k];
    });
    return dbj;
  }


  function restore_object(obj, rbj) {
    Object.keys(obj).forEach(function (k) {
      delete obj[k];
    });

    Object.keys(rbj).forEach(function (k) {
      obj[k] = rbj[k];
    });
    return obj;
  }

  function entry_loaded(name) {
    if (loaded[name]) return true
  }

  function resolve_resource(name, type) {
    const entry = this;

    return new Promise(function (resolve) {
      if (cache[name] !== undefined) return resolve(cache[name]);
      if (entry.__resolvers[name]) {
        resolve(entry.__resolvers[name]());
        return;
      }
      last_url = name;
      get_file(name, type).then(function (data) {
        if (type == "base64" && is_browser) {
          let reader = new FileReader();
          reader.readAsDataURL(data);
          reader.onloadend = function () {
            data = reader.result.split(",")[1];
            cache[name] = data;
            resolve(data);
          }
        }
        else {
          cache[name] = data;
          resolve(data);
        }

      })

    })
  }

  function resolve_path(url) {
    if (this.__resolvers[url]) return url;

    if (!is_browser) {
      console.log("resolve_path", url);

      if (fs.existsSync(url)) {
        return url;
      }
    }

    if ((url.indexOf("/") !== 0
      && url.indexOf("@") !== 0
      && (!(/http.*\:\/\//).test(url))

    )) url = this.__base_folder + url;
    url = url.replace("@", root_url);


    return url;
  }
  let packing;


  function get_export_packages(entry, list) {


    list = list || [];
    if (entry === undefined || entry.__is_child) return list;
    entry.__packages.forEach(function (b) {
      get_export_packages(loaded[b], list);
      list.push(b);
      if (loaded[b]) {
        loaded[b].__children.forEach(function (c) {
          if (loaded[c]) {
            loaded[c].__packages.forEach(function (cp) {
              list.push(cp);
            })
          }
          list.push(c);
        });
      }

    });

    return list;
  }

  function export_entry(entry) {
    return new Promise(function (resolve) {
      const list = get_export_packages(entry);
      list.push(entry.__name);
      //console.log(entry.__name, list.slice());
      const output = [];
      //	output.push('(function(document){')
      output.push('function BB(document){')
      output.push("const is_browser = (typeof window !== 'undefined');const global=function(f){return f}\n");
      if (!is_browser) {
        output.push(
          'if (typeof atob == "undefined") {atob=function(v){return Buffer.from(v, "utf8").toString("base64");}}',
          'if (typeof btoa == "undefined") {btoa=function(v){return Buffer.from(v, "base64").toString("utf8");}}'
        );
      }
      if (entry.__include_packing) {
        const packing_source = str_to_base64(create_packing.toString());
        output.push('\nconst create_packing=new Function("return "+atob("' + packing_source + '"))();',
          'let packing;',
          'if (is_browser) packing = create_packing(""); else packing = create_packing(process.cwd());');
      }
      output.push('const __BB={};');

      output.push('if(typeof preloader !== "undefined") preloader(__BB);');
      const exportednow = {};



      Object.keys(entry.__store).forEach(function (k) {
        output.push('__BB["' + k + '"]=atob("' + str_to_base64(entry.__store[k]) + '");\n');
      });

      list.forEach(function (L) {
        if (exportednow[L]) return;
        if (loaded[L]) {

          const lntry = loaded[L];

          //console.log(L, lntry.__compressed);
          if (lntry.__compressed == true || entry.__compressed) {
            output.push('__BB["' + L + '"]=new Function("return "+atob("' + str_to_base64(lntry.__source) + '"))()');
          }
          else {
            output.push('__BB["' + L + '"]=' + lntry.__source);
          }


         
          //console.log(lntry.__name, lntry.__args)

          lntry.__args.forEach(function (a) {
            if (lntry.__resources[a]) {
              output.push('__BB["' + a + '"]=packing.loaded["' + L + '"].__resources["' + a + '"];');
            }
          });

          output.push('__BB["' + L + '"]=__BB["' + L + '"]' + '.apply(__BB["' + L + '"],[' + lntry.__args.map(
            function (a) {
              if (a.indexOf("=") > 0) {
                a = a.split("=");
                a = JSON.parse(a[1].trim());
              }
              if (lntry.__resources[a]) {
                //return 'bunn.loaded["' + L + '"].__resources["' + a + '"]';
              }

              else if (entry.__resources[a]) {
             //   return 'packing.loaded["' + entry.__name + '"].__resources["' + a + '"]';
              }
              else if (entry.__store[a]) {
                return '__BB["' + a + '"]';
              }
              else if (globals[a]) {
                return '__BB["' + globals[a] + '"]["' + a + '"]';
              }
              else if (a === "entry") {
                return entry.__name;
              }
              return '__BB["' + a + '"]'

            }).join() + ']);');
        }
        exportednow[L] = true;

      });
      output.push('return __BB;}');

			let bundle = output.join("\n");

      function final_bundle(bundle) {
        return [
          '(',
          bundle,
          ')((',
          function () {
            let doc = {};

            if (typeof document !== "undefined") {
              doc = document;
            }
            if (typeof helement !== "undefined") {
              doc.helement = helement;
            }
            return doc;
          }.toString(),
          ')())'

        ].join('').replace(/__BB/g, entry.__name.length > 0 ? entry.__name : "entry");


      }
      each(function (next, i) {
        if (i <= on_bundle.length - 1) {
          const BB = on_bundle[i];
          const res = BB(bundle, entry);
          if (res instanceof Promise) {
            res.then(function (res) {
              bundle = res;
              next(i + 1);
            });
          }
          else {
            bundle = res;
            next(i + 1);

          }
        }
        else {
          bundle = final_bundle(bundle);
          resolve(bundle);
        }

      }, 0);



    });
  }
	function hash_str(str) {
		let hash = 2166136261;
		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			hash = Math.imul(hash, 16777619);
		}
		return hash >>> 0;
	}
  
  const compile_entry = (function () {

    function parse_include(text, entry, base_url,  done,_tag) {

      let res = [], s, ic, h, url, t, aa, force;


			let text2 = " " + text;
			_tag = _tag || "import";

			const _rgx = new RegExp(_tag + "\\(.*\\)", "g");

			ic = text2.search(_rgx);
      while (ic > 0) {
        s = text2.substr(ic, (text2.indexOf(")", ic) - ic) + 1);
        res.push(s);
        text2 = text2.replace(s, "");
				ic = text2.search(_rgx);
      }



      if (res.length > 0) {
        each(function (next, i) {
          if (i > res.length - 1) {
            done(text);
            return;
          }

          t = undefined;
          s = res[i];


          url = s.substr(s.indexOf("(") + 1, (s.indexOf(")") - s.indexOf("(")) - 1).replace(/\'|\"/g, '').trim();

          //  console.log("url", url);
          if (url.indexOf(",") > 0) {
            aa = url.split(",");
            t = aa[1].trim();
            url = aa[0].trim();
          }


          // if (url.indexOf("/") !== 0 && url.indexOf("@") !== 0 && (!(/http.*\:\/\//).test(url))) url = base_url + url;
					url = entry.__resolve_path(url);
					//console.log(_tag, url, t);

          entry.__resolve(url, t).then(function (data) {
            ic = text.indexOf(s);
            parse_include(data, entry, url.indexOf("/") === 0 ? base_url : url.replace(url.split("/").pop(), ""), function (data) {
              text = text.substr(0, ic) + (data) + text.substr(ic + s.length, text.length);
							next(i + 1);
						}, _tag);
          });
        });
      }
      else {
        done(text);
      }


    }

		const script_gen = (function () {

			// --- PRECEDENCE TABLE ---
			var PRECEDENCE = {
				'=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1, '%=': 1,
				'**=': 1,
				'<<=': 1, '>>=': 1, '>>>=': 1, '&=': 1, '^=': 1, '|=': 1,
				'||=': 1, '&&=': 1, '??=': 1,
				'?': 2, // Conditional
				'??': 2, // Nullish coalescing (same level as ternary for parsing)
				'||': 3,
				'&&': 4,
				'|': 5,
				'^': 6,
				'&': 7,
				'==': 8, '!=': 8, '===': 8, '!==': 8,
				'<': 9, '>': 9, '<=': 9, '>=': 9, 'in': 9, 'instanceof': 9,
				'<<': 10, '>>': 10, '>>>': 10,
				'+': 11, '-': 11,
				'*': 12, '/': 12, '%': 12,
				'**': 13,
				'prefix': 14,
				'postfix': 15,
				'call': 17,
				'member': 18
			};

			// Explicit list of right-associative assignment operators
			var ASSIGNMENT_OPS = [
				'=', '+=', '-=', '*=', '**=', '/=', '%=',
				'<<=', '>>=', '>>>=', '&=', '^=', '|=',
				'||=', '&&=', '??='
			];

			// --- LEXER PATTERNS ---
			// FIX: Added ** and **= operators (must come before single * to match greedily).
			//      Added ?? and ??= and ||= and &&= operators.
			//      Added ... (spread/rest) as a Punctuation token.
			var PATTERNS = [
				{ type: 'Whitespace', regex: /^\s+/ },
				{ type: 'Comment', regex: /^(\/\/.*|\/\*[\s\S]*?\*\/)/ },
				// Numbers: hex (0x...), binary (0b...), octal (0o...), float, int
				{ type: 'Number', regex: /^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+(\.\d+)?([eE][+-]?\d+)?)/ },
				// Strings: double-quoted, single-quoted, template literal (backtick)
				{ type: 'String', regex: /^"((?:[^"\\]|\\[\s\S])*)"|^'((?:[^'\\]|\\[\s\S])*)'|^`((?:[^`\\]|\\[\s\S])*)`/ },
				// Keywords
				{ type: 'Keyword', regex: /^(break|case|catch|const|continue|debugger|default|delete|do|else|finally|for|function|if|in|instanceof|let|new|return|switch|this|throw|try|typeof|var|void|while|with)\b/ },
				{ type: 'Identifier', regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/ },
				// Operators: longer tokens MUST come before their prefixes.
				// **= before **, >>= before >>, etc.
				{ type: 'Operator', regex: /^(\*\*=|\*\*|\+\+|--|===|!==|==|!=|<=|>=|=>|&&=|\|\|=|\?\?=|&&|\|\||\?\?|>>>=|<<=|>>=|\+=|-=|\*=|\/=|%=|\|=|&=|\^=|>>>|<<|>>|[+\-*/%=<>!&|^~])/ },
				// Punctuation: multi-char tokens MUST come before the single-char character class.
				// '...' before '.', '?.' before '?' and '.'
				{ type: 'Punctuation', regex: /^(\.\.\.|\.\.|\?\.|[{}[\](),;.:?])/ }
			];


			// --- LEXER ---

			function lexer(input) {
				var cursor = 0;
				var tokens = [];
				var line = 1;
				var column = 0;

				// Context tracking: can the next '/' be a regex literal?
				var canBeRegex = true;

				while (cursor < input.length) {
					var remaining = input.slice(cursor);
					var matchFound = false;

					// 1. Check for Regex Literal (only when '/' is not division)
					if (canBeRegex && remaining.charAt(0) === '/') {
						var regexMatch = /^\/((?:\\.|[^/\\\n])+)\/([gimsuy]*)/.exec(remaining);
						if (regexMatch) {
							tokens.push({
								type: 'RegExp',
								value: regexMatch[0],
								line: line,
								column: column
							});
							cursor += regexMatch[0].length;
							column += regexMatch[0].length;
							canBeRegex = false;
							continue;
						}
					}

					// 2. Standard Patterns
					for (var i = 0; i < PATTERNS.length; i++) {
						var match = PATTERNS[i].regex.exec(remaining);
						if (match) {
							var text = match[0];

							if (PATTERNS[i].type !== 'Whitespace' && PATTERNS[i].type !== 'Comment') {
								tokens.push({
									type: PATTERNS[i].type,
									value: text,
									line: line,
									column: column
								});

								// Update canBeRegex context for next token
								var t = PATTERNS[i].type;
								if (t === 'Identifier' || t === 'Number') {
									canBeRegex = false;
								} else if (t === 'Punctuation') {
									// After ) or ] a '/' is division; after everything else it could be regex
									canBeRegex = (text !== ')' && text !== ']');
								} else if (t === 'Operator') {
									canBeRegex = true;
								} else if (t === 'Keyword') {
									canBeRegex = (text !== 'this');
								} else if (t === 'String' || t === 'RegExp') {
									canBeRegex = false;
								}
							}

							// Update line/column tracking
							var newlines = text.split('\n');
							if (newlines.length > 1) {
								line += newlines.length - 1;
								column = newlines[newlines.length - 1].length;
							} else {
								column += text.length;
							}

							cursor += text.length;
							matchFound = true;
							break;
						}
					}

					if (!matchFound) {
						console.warn("Unknown character at " + line + ":" + column + " -> " + remaining[0]);
						cursor++;
						column++;
					}
				}

				tokens.forEach(function (tok, i) { tok.index = i; });
				return tokens;
			}

			// --- PARSER CONSTRUCTOR ---
			function script_gen(code) {
				this.tokens = lexer(code);
				this.cursor = 0;
				this.prevToken = null;
			}

			script_gen.prototype.newProgram = function (code) {
				this.tokens = lexer(code);
				this.cursor = 0;
				this.prevToken = null;
				return this;
			};

			(function () {

				script_gen.prototype.eof = function () {
					return this.cursor >= this.tokens.length;
				};

				script_gen.prototype.peek = function () {
					return this.tokens[this.cursor] || { type: 'EOF', value: '' };
				};

				script_gen.prototype.peekAt = function (offset) {
					return this.tokens[this.cursor + offset] || { type: 'EOF', value: '' };
				};

				// --- EAT with Automatic Semicolon Insertion ---
				script_gen.prototype.eat = function (type) {
					var token = this.peek();

					if (type === ';') {
						if (token.value === ';') {
							this.prevToken = token;
							this.cursor++;
							return token;
						}
						// ASI: EOF, '}', or a line break between prev and current token
						var isLineBreak = this.prevToken && token.type !== 'EOF' && (token.line > this.prevToken.line);
						var isBlockEnd = token.value === '}';
						var isEOF = token.type === 'EOF';
						if (isLineBreak || isBlockEnd || isEOF) {
							return { type: 'Punctuation', value: ';', generated: true };
						}
						// FIX: removed the stray bare `return token;` that short-circuited ASI logic
					}

					if (!token || (type && token.type !== type && token.value !== type)) {
						var err = new Error('Unexpected token: ' + (token ? token.value : 'EOF') +
							' (expected ' + type + ') at ' + (token ? token.line + ':' + token.column : 'EOF'));
						if (token) err.loc = { line: token.line, column: token.column };
						console.log(token, this);
						throw err;
					}
					this.prevToken = token;
					this.cursor++;
					return token;
				};

				// --- PROGRAM ---

				script_gen.prototype.parseProgram = function () {
					var body = [];
					while (!this.eof()) {
						body.push(this.parseStatement());
					}
					return { type: 'Program', body: body };
				};

				// --- STATEMENTS ---

				script_gen.prototype.parseStatement = function () {
					var token = this.peek();

					// Empty statement
					if (token.value === ';') {
						this.eat(';');
						return { type: 'EmptyStatement' };
					}

					// Declarations
					if (token.value === 'function') return this.parseFunctionDeclaration();
					if (token.value === 'var' || token.value === 'let' || token.value === 'const') return this.parseVariableDeclaration();

					// Control flow
					if (token.value === 'return') return this.parseReturnStatement();
					if (token.value === 'if') return this.parseIfStatement();
					if (token.value === 'for') return this.parseForStatement();
					if (token.value === 'while') return this.parseWhileStatement();
					if (token.value === 'do') return this.parseDoWhileStatement();
					if (token.value === 'switch') return this.parseSwitchStatement();
					if (token.value === 'try') return this.parseTryCatch();
					if (token.value === 'throw') return this.parseThrowStatement();
					if (token.value === 'break') { this.eat('break'); this.eat(';'); return { type: 'BreakStatement' }; }
					if (token.value === 'continue') { this.eat('continue'); this.eat(';'); return { type: 'ContinueStatement' }; }
					if (token.value === 'debugger') { this.eat('debugger'); this.eat(';'); return { type: 'DebuggerStatement' }; }

					// Block
					if (token.value === '{') return this.parseBlock();

					// Labeled statement: Identifier followed immediately by ':'
					if (token.type === 'Identifier') {
						var next = this.tokens[this.cursor + 1];
						if (next && next.value === ':') {
							var label = this.eat('Identifier');
							this.eat(':');
							var body = this.parseStatement();
							return { type: 'LabeledStatement', label: label, body: body };
						}
					}

					// Expression statement — parseExpression handles SequenceExpressions (comma operator)
					var expr = this.parseExpression();
					this.eat(';');
					return { type: 'ExpressionStatement', expression: expr };
				};

				script_gen.prototype.parseBlock = function () {
					this.eat('{');
					var body = [];
					while (!this.eof() && this.peek().value !== '}') {
						body.push(this.parseStatement());
					}
					this.eat('}');
					return { type: 'BlockStatement', body: body };
				};

				script_gen.prototype.parseVariableDeclaration = function () {
					var kind = this.eat().value; // var, let, const
					var declarations = [];
					do {
						// FIX: support destructuring patterns as declarator id
						var id = this.parseBindingPattern();
						var init = null;
						if (this.peek().value === '=') {
							this.eat('=');
							// FIX: use parseAssignmentExpression so commas don't bleed into sequence
							init = this.parseAssignmentExpression();
						}
						declarations.push({
							type: 'VariableDeclarator',
							id: id,
							init: init
						});
					} while (this.peek().value === ',' && this.eat(','));
					this.eat(';');
					return { type: 'VariableDeclaration', declarations: declarations, kind: kind };
				};

				// Like parseVariableDeclaration but without the trailing semicolon (used in for-init)
				script_gen.prototype.parseVariableDeclarationList = function () {
					var kind = this.eat().value;
					var declarations = [];
					do {
						var id = this.parseBindingPattern();
						var init = null;
						if (this.peek().value === '=') {
							this.eat('=');
							init = this.parseAssignmentExpression();
						}
						declarations.push({
							type: 'VariableDeclarator',
							id: id,
							init: init
						});
					} while (this.peek().value === ',' && this.eat(','));
					return { type: 'VariableDeclaration', declarations: declarations, kind: kind };
				};

				// FIX: Parse destructuring binding patterns ({ a, b } or [ a, b ])
				// Falls back to plain Identifier for the common case.
				script_gen.prototype.parseBindingPattern = function () {
					var token = this.peek();
					if (token.value === '{') {
						return this.parseObjectPattern();
					}
					if (token.value === '[') {
						return this.parseArrayPattern();
					}
					return { type: 'Identifier', name: this.eat('Identifier').value };
				};

				script_gen.prototype.parseObjectPattern = function () {
					this.eat('{');
					var props = [];
					while (this.peek().value !== '}') {
						if (this.peek().value === '...') {
							this.eat('...');
							props.push({
								type: 'RestElement',
								argument: { type: 'Identifier', name: this.eat('Identifier').value }
							});
							break;
						}
						var key;
						var computed = false;
						if (this.peek().value === '[') {
							this.eat('[');
							key = this.parseAssignmentExpression();
							this.eat(']');
							computed = true;
						} else if (this.peek().type === 'Identifier' || this.peek().type === 'Keyword') {
							key = { type: 'Identifier', name: this.eat().value };
						} else {
							key = { type: 'Literal', value: this.peek().value, raw: this.eat().value };
						}

						var value;
						if (this.peek().value === ':') {
							this.eat(':');
							value = this.parseBindingPattern();
						} else {
							// Shorthand: { a } or { a = default }
							value = { type: 'Identifier', name: key.name };
						}

						var defaultValue = null;
						if (this.peek().value === '=') {
							this.eat('=');
							defaultValue = this.parseAssignmentExpression();
						}

						props.push({
							type: 'Property',
							key: key,
							value: defaultValue ? { type: 'AssignmentPattern', left: value, right: defaultValue } : value,
							computed: computed,
							shorthand: !computed && value.type === 'Identifier' && (!key.name || key.name === value.name)
						});
						if (this.peek().value === ',') this.eat(','); else break;
					}
					this.eat('}');
					return { type: 'ObjectPattern', properties: props };
				};

				script_gen.prototype.parseArrayPattern = function () {
					this.eat('[');
					var elements = [];
					while (this.peek().value !== ']') {
						if (this.peek().value === ',') {
							elements.push(null); // hole
							this.eat(',');
							continue;
						}
						if (this.peek().value === '...') {
							this.eat('...');
							elements.push({ type: 'RestElement', argument: this.parseBindingPattern() });
							break;
						}
						var el = this.parseBindingPattern();
						if (this.peek().value === '=') {
							this.eat('=');
							el = { type: 'AssignmentPattern', left: el, right: this.parseAssignmentExpression() };
						}
						elements.push(el);
						if (this.peek().value === ',') this.eat(','); else break;
					}
					this.eat(']');
					return { type: 'ArrayPattern', elements: elements };
				};

				script_gen.prototype.parseFunctionDeclaration = function () {
					this.eat('function');
					var generator = false;
					if (this.peek().value === '*') { this.eat('*'); generator = true; }
					var id = { type: 'Identifier', name: 'anonymous' };
					if (this.peek().type === 'Identifier') {
						id = { type: 'Identifier', name: this.eat('Identifier').value };
					}
					this.eat('(');
					var params = this.parseParamList();
					this.eat(')');
					var body = this.parseBlock();
					return { type: 'FunctionDeclaration', id: id, params: params, body: body, generator: generator };
				};

				script_gen.prototype.parseIfStatement = function () {
					this.eat('if');
					this.eat('(');
					var test = this.parseExpression();
					this.eat(')');
					var consequent = this.parseStatement();
					var alternate = null;
					if (this.peek().value === 'else') {
						this.eat('else');
						alternate = this.parseStatement();
					}
					return { type: 'IfStatement', test: test, consequent: consequent, alternate: alternate };
				};

				script_gen.prototype.parseReturnStatement = function () {
					this.eat('return');
					var argument = null;
					var isLineBreak = this.prevToken && this.peek().type !== 'EOF' && (this.peek().line > this.prevToken.line);
					if (this.peek().value !== ';' && !isLineBreak && this.peek().value !== '}') {
						argument = this.parseExpression();
					}
					this.eat(';');
					return { type: 'ReturnStatement', argument: argument };
				};

				script_gen.prototype.parseForStatement = function () {
					this.eat('for');
					this.eat('(');

					var init = null;

					if (this.peek().value === 'var' || this.peek().value === 'let' || this.peek().value === 'const') {
						init = this.parseVariableDeclarationList();
					} else if (this.peek().value !== ';') {
						init = this.parseExpression();
					}

					// Check for for-in / for-of
					var isForIn = false, isForOf = false;
					var right = null;

					if (this.peek().value === 'in') {
						this.eat('in');
						isForIn = true;
						right = this.parseExpression();
					} else if (this.peek().type === 'Identifier' && this.peek().value === 'of') {
						this.eat();
						isForOf = true;
						right = this.parseExpression();
					} else if (init && init.type === 'BinaryExpression' && init.operator === 'in') {
						// 'in' was consumed as binary op — re-interpret as for-in
						isForIn = true;
						right = init.right;
						init = init.left;
					}

					if (isForIn) {
						this.eat(')');
						var body = this.parseStatement();
						return { type: 'ForInStatement', left: init, right: right, body: body };
					}
					if (isForOf) {
						this.eat(')');
						var body = this.parseStatement();
						return { type: 'ForOfStatement', left: init, right: right, body: body };
					}

					// Standard for loop
					this.eat(';');
					var test = null;
					if (this.peek().value !== ';') test = this.parseExpression();
					this.eat(';');
					var update = null;
					if (this.peek().value !== ')') update = this.parseExpression();
					this.eat(')');
					var body = this.parseStatement();
					return { type: 'ForStatement', init: init, test: test, update: update, body: body };
				};

				script_gen.prototype.parseWhileStatement = function () {
					this.eat('while');
					this.eat('(');
					var test = this.parseExpression();
					this.eat(')');
					var body = this.parseStatement();
					return { type: 'WhileStatement', test: test, body: body };
				};

				script_gen.prototype.parseDoWhileStatement = function () {
					this.eat('do');
					var body = this.parseStatement();
					this.eat('while');
					this.eat('(');
					var test = this.parseExpression();
					this.eat(')');
					this.eat(';');
					return { type: 'DoWhileStatement', body: body, test: test };
				};

				script_gen.prototype.parseSwitchStatement = function () {
					this.eat('switch');
					this.eat('(');
					var disc = this.parseExpression();
					this.eat(')');
					this.eat('{');
					var cases = [];
					while (this.peek().value !== '}') {
						var test = null;
						if (this.peek().value === 'case') { this.eat('case'); test = this.parseExpression(); }
						else { this.eat('default'); }
						this.eat(':');
						var cons = [];
						while (this.peek().value !== 'case' && this.peek().value !== 'default' && this.peek().value !== '}') {
							cons.push(this.parseStatement());
						}
						cases.push({ type: 'SwitchCase', test: test, consequent: cons });
					}
					this.eat('}');
					return { type: 'SwitchStatement', discriminant: disc, cases: cases };
				};

				script_gen.prototype.parseThrowStatement = function () {
					this.eat('throw');
					var arg = this.parseExpression();
					this.eat(';');
					return { type: 'ThrowStatement', argument: arg };
				};

				script_gen.prototype.parseTryCatch = function () {
					this.eat('try');
					var block = this.parseBlock();
					var handler = null;
					var finalizer = null;
					if (this.peek().value === 'catch') {
						this.eat('catch');
						var param = null;
						if (this.peek().value === '(') {
							this.eat('(');
							param = { type: 'Identifier', name: this.eat('Identifier').value };
							this.eat(')');
						}
						var body = this.parseBlock();
						handler = { type: 'CatchClause', param: param, body: body };
					}
					if (this.peek().value === 'finally') {
						this.eat('finally');
						finalizer = this.parseBlock();
					}
					return { type: 'TryStatement', block: block, handler: handler, finalizer: finalizer };
				};

				// --- EXPRESSIONS ---

				// parseExpression: top-level — handles the comma/sequence operator.
				// Use this for: statement-level, return, throw, if/while/for conditions,
				// for-update, switch discriminant.
				script_gen.prototype.parseExpression = function () {
					var expr = this.parseAssignmentExpression();
					// FIX: SequenceExpression support — comma operator at statement level
					if (this.peek().value === ',') {
						var exprs = [expr];
						while (this.peek().value === ',') {
							this.eat(',');
							exprs.push(this.parseAssignmentExpression());
						}
						return { type: 'SequenceExpression', expressions: exprs };
					}
					return expr;
				};

				// parseAssignmentExpression: single expression without sequence comma.
				// Use this for: array elements, object values, call arguments,
				// variable declarator inits, default parameter values — anywhere a comma
				// is a separator rather than an operator.
				script_gen.prototype.parseAssignmentExpression = function () {
					// Arrow function with no params: () => ...
					// Detected early: peek is '(' and the closing ')' is followed by '=>'
					// We handle this by letting parseAtom produce a GroupExpression then catching '=>' below.

					var expr = this.parseBinaryExpression(this.parseMaybeUnary(), 0);

					// Ternary / conditional
					if (this.peek().value === '?') {
						this.eat('?');
						var consequent = this.parseAssignmentExpression();
						this.eat(':');
						var alternate = this.parseAssignmentExpression();
						return { type: 'ConditionalExpression', test: expr, consequent: consequent, alternate: alternate };
					}

					// Arrow function: params => body
					if (this.peek().value === '=>') {
						this.eat('=>');
						var params = this.arrowParamsFromExpr(expr);
						var body;
						if (this.peek().value === '{') {
							body = this.parseBlock();
						} else {
							body = this.parseAssignmentExpression();
						}
						return { type: 'ArrowFunctionExpression', params: params, body: body, expression: body.type !== 'BlockStatement' };
					}

					return expr;
				};

				// Convert a parsed expression into an arrow-function parameter list.
				script_gen.prototype.arrowParamsFromExpr = function (expr) {
					// Single bare identifier: x =>
					if (expr.type === 'Identifier') {
						return [expr];
					}
					// Grouped expression: (a, b) => or () => or (a) =>
					if (expr.type === 'GroupExpression') {
						// Empty params: () =>
						if (!expr.argument) return [];
						var inner = expr.argument;
						// Single identifier param: (a) =>
						if (inner.type === 'Identifier') return [inner];
						// Destructuring or rest: ([a,b]) => or ({a}) => or (...rest) =>
						if (inner.type === 'ObjectPattern' || inner.type === 'ArrayPattern' || inner.type === 'RestElement') return [inner];
						// Default: (a = 1) => — was parsed as BinaryExpression with op '='
						if (inner.type === 'BinaryExpression' && inner.operator === '=') {
							return [{ type: 'AssignmentPattern', left: inner.left, right: inner.right }];
						}
						// Multiple params via SequenceExpression: (a, b, c) =>
						if (inner.type === 'SequenceExpression') {
							return inner.expressions.map(function (e) {
								if (e.type === 'BinaryExpression' && e.operator === '=') {
									return { type: 'AssignmentPattern', left: e.left, right: e.right };
								}
								if (e.type === 'SpreadElement') {
									return { type: 'RestElement', argument: e.argument };
								}
								return e;
							});
						}
						return [inner];
					}
					// SpreadElement at top level: ...rest =>  (rare but valid)
					if (expr.type === 'SpreadElement') {
						return [{ type: 'RestElement', argument: expr.argument }];
					}
					return [];
				};

				script_gen.prototype.parseBinaryExpression = function (left, minPrecedence) {
					var token = this.peek();
					while (
						token &&
						token.value !== '=>' &&  // => is not a binary operator
						(token.type === 'Operator' || token.value === 'in' || token.value === 'instanceof') &&
						(PRECEDENCE[token.value] !== undefined ? PRECEDENCE[token.value] : -1) >= minPrecedence
					) {
						var op = token.value;
						var prec = PRECEDENCE[op] || 0;
						var nextMin = (ASSIGNMENT_OPS.indexOf(op) !== -1) ? prec : prec + 1;

						this.eat(); // consume the operator

						var right;
						if (ASSIGNMENT_OPS.indexOf(op) !== -1) {
							right = this.parseAssignmentExpression();
						} else {
							right = this.parseBinaryExpression(this.parseMaybeUnary(), nextMin);
						}

						left = { type: 'BinaryExpression', operator: op, left: left, right: right };
						token = this.peek();
					}
					return left;
				};

				script_gen.prototype.parseMaybeUnary = function () {
					var token = this.peek();

					// FIX: added '~' (bitwise NOT) and 'void' to prefix operators
					if (['++', '--', '!', '+', '-', '~', 'typeof', 'void', 'delete', 'await'].indexOf(token.value) !== -1) {
						this.eat();
						var arg = this.parseMaybeUnary();
						var nodeType = (token.value === '++' || token.value === '--') ? 'UpdateExpression' : 'UnaryExpression';
						return { type: nodeType, operator: token.value, prefix: true, argument: arg };
					}

					// FIX: spread/rest inside expressions: ...x
					if (token.value === '...') {
						this.eat('...');
						var arg = this.parseMaybeUnary();
						return { type: 'SpreadElement', argument: arg };
					}

					var expr = this.parseMemberExpression();

					// Postfix ++ / --  (no newline between expr and operator)
					if (this.peek().value === '++' || this.peek().value === '--') {
						if (!(this.prevToken && this.peek().line > this.prevToken.line)) {
							var op = this.eat().value;
							return { type: 'UpdateExpression', operator: op, prefix: false, argument: expr };
						}
					}
					return expr;
				};

				script_gen.prototype.parseMemberExpression = function (allowCall) {
					allowCall = allowCall !== false;
					var object = this.parseAtom();

					while (true) {
						if (this.peek().value === '.') {
							this.eat('.');
							var propToken = this.peek();
							var prop;
							if (propToken.type === 'Keyword') {
								prop = { type: 'Identifier', name: this.eat().value };
							} else if (propToken.type === 'String') {
								var raw = this.eat().value;
								prop = { type: 'Identifier', name: raw.slice(1, -1) };
							} else {
								var eaten = this.eat('Identifier');
								prop = { type: 'Identifier', name: eaten.value };
							}
							object = { type: 'MemberExpression', object: object, property: prop, computed: false };

						} else if (this.peek().value === '[') {
							this.eat('[');
							var prop = this.parseExpression();
							this.eat(']');
							object = { type: 'MemberExpression', object: object, property: prop, computed: true };

						} else if (allowCall && this.peek().value === '(') {
							this.eat('(');
							var args = this.parseArgumentList();
							this.eat(')');
							object = { type: 'CallExpression', callee: object, arguments: args };

						} else if (this.peek().value === '?.') {
							// Optional chaining: obj?.prop or obj?.[expr] or obj?.()
							this.eat('?.');
							if (this.peek().value === '[') {
								this.eat('[');
								var prop = this.parseExpression();
								this.eat(']');
								object = { type: 'OptionalMemberExpression', object: object, property: prop, computed: true, optional: true };
							} else if (this.peek().value === '(') {
								this.eat('(');
								var args = this.parseArgumentList();
								this.eat(')');
								object = { type: 'OptionalCallExpression', callee: object, arguments: args, optional: true };
							} else {
								var eaten = this.eat('Identifier');
								object = { type: 'OptionalMemberExpression', object: object, property: { type: 'Identifier', name: eaten.value }, computed: false, optional: true };
							}
						} else {
							break;
						}
					}
					return object;
				};

				// FIX: Centralised argument-list parser used by calls AND new-expressions.
				// Uses parseAssignmentExpression so commas separate args, not build sequences.
				// Handles spread elements (...x) as arguments.
				script_gen.prototype.parseArgumentList = function () {
					var args = [];
					while (this.peek().value !== ')') {
						if (this.peek().value === '...') {
							this.eat('...');
							args.push({ type: 'SpreadElement', argument: this.parseAssignmentExpression() });
						} else {
							args.push(this.parseAssignmentExpression());
						}
						if (this.peek().value === ',') {
							this.eat(',');
							// Allow trailing comma: func(a, b,)
						} else {
							break;
						}
					}
					return args;
				};

				// FIX: Centralised parameter-list parser (handles defaults, rest, destructuring).
				script_gen.prototype.parseParamList = function () {
					var params = [];
					while (this.peek().value !== ')') {
						if (this.peek().value === '...') {
							this.eat('...');
							params.push({ type: 'RestElement', argument: this.parseBindingPattern() });
							break; // rest must be last
						}
						var param = this.parseBindingPattern();
						if (this.peek().value === '=') {
							this.eat('=');
							param = { type: 'AssignmentPattern', left: param, right: this.parseAssignmentExpression() };
						}
						params.push(param);
						if (this.peek().value === ',') this.eat(','); else break;
					}
					return params;
				};

				script_gen.prototype.parseAtom = function () {
					var token = this.peek();

					// Number
					if (token.type === 'Number') {
						this.eat();
						return { type: 'Literal', value: Number(token.value), raw: token.value };
					}

					// Template literal — transpile to string concatenation
					if (token.type === 'String' && token.value.charAt(0) === '`') {
						this.eat();
						var raw = token.value.slice(1, -1);
						var parts = [];
						var buffer = '';
						var depth = 0;
						var inExpr = false;

						for (var i = 0; i < raw.length; i++) {
							var ch = raw[i];
							if (inExpr) {
								if (ch === '{') depth++;
								else if (ch === '}') depth--;
								if (depth === 0) {
									var subParser = new script_gen(buffer);
									parts.push(subParser.parseExpression());
									inExpr = false;
									buffer = '';
								} else {
									buffer += ch;
								}
							} else {
								if (ch === '$' && raw[i + 1] === '{') {
									if (buffer.length > 0) {
										var esc = buffer.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
										parts.push({ type: 'Literal', value: buffer, raw: '"' + esc + '"' });
									}
									buffer = '';
									inExpr = true;
									i++; depth = 1;
								} else {
									buffer += ch;
								}
							}
						}
						if (buffer.length > 0) {
							var esc = buffer.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
							parts.push({ type: 'Literal', value: buffer, raw: '"' + esc + '"' });
						}
						if (parts.length === 0) return { type: 'Literal', value: '', raw: '""' };
						if (parts[0].type !== 'Literal') parts.unshift({ type: 'Literal', value: '', raw: '""' });
						var root = parts[0];
						for (var j = 1; j < parts.length; j++) {
							root = { type: 'BinaryExpression', operator: '+', left: root, right: parts[j] };
						}
						return root;
					}

					// Regular string
					if (token.type === 'String') {
						this.eat();
						return { type: 'Literal', value: token.value, raw: token.value };
					}

					// RegExp
					if (token.type === 'RegExp') {
						this.eat();
						return { type: 'Literal', value: token.value, raw: token.value, regex: true };
					}

					// Keywords
					if (token.type === 'Keyword') {
						if (token.value === 'function') return this.parseFunctionExpression();
						if (token.value === 'this') { this.eat(); return { type: 'ThisExpression' }; }
						if (token.value === 'new') {
							this.eat();
							// FIX: handle `new.target`
							if (this.peek().value === '.' && this.peekAt(1).value === 'target') {
								this.eat('.'); this.eat('target');
								return { type: 'MetaProperty', meta: { type: 'Identifier', name: 'new' }, property: { type: 'Identifier', name: 'target' } };
							}
							var callee = this.parseMemberExpression(false);
							var args = [];
							if (this.peek().value === '(') {
								this.eat('(');
								args = this.parseArgumentList();
								this.eat(')');
							}
							return { type: 'NewExpression', callee: callee, arguments: args };
						}
						// FIX: `typeof`, `void`, `delete` should have been caught in parseMaybeUnary,
						// but guard here so they don't become unknown atoms.
						if (token.value === 'typeof' || token.value === 'void' || token.value === 'delete') {
							this.eat();
							var arg = this.parseMaybeUnary();
							return { type: 'UnaryExpression', operator: token.value, prefix: true, argument: arg };
						}
					}

					// Identifiers (includes true, false, null, undefined)
					if (token.type === 'Identifier') {
						if (token.value === 'true') { this.eat(); return { type: 'Literal', value: true, raw: 'true' }; }
						if (token.value === 'false') { this.eat(); return { type: 'Literal', value: false, raw: 'false' }; }
						if (token.value === 'null') { this.eat(); return { type: 'Literal', value: null, raw: 'null' }; }
						if (token.value === 'undefined') { this.eat(); return { type: 'Literal', value: undefined, raw: 'undefined' }; }
						if (token.value === 'Infinity') { this.eat(); return { type: 'Literal', value: Infinity, raw: 'Infinity' }; }
						if (token.value === 'NaN') { this.eat(); return { type: 'Literal', value: NaN, raw: 'NaN' }; }

						// Check for async arrow: async (...) => or async id =>
						if (token.value === 'async') {
							var next = this.peekAt(1);
							if (next && (next.type === 'Identifier' || next.value === '(')) {
								this.eat(); // consume 'async'
								// Let the normal path build the expression; the => handler in
								// parseAssignmentExpression will convert it to ArrowFunctionExpression
								var inner = this.parseMemberExpression();
								if (this.peek().value === '=>') {
									this.eat('=>');
									var params = this.arrowParamsFromExpr(inner);
									var body = this.peek().value === '{'
										? this.parseBlock()
										: this.parseAssignmentExpression();
									return { type: 'ArrowFunctionExpression', params: params, body: body, async: true, expression: body.type !== 'BlockStatement' };
								}
								return inner;
							}
						}

						return { type: 'Identifier', name: this.eat().value };
					}

					// Grouped expression / arrow-function params
					if (token.value === '(') {
						this.eat('(');
						// Empty parens () — must be arrow function
						if (this.peek().value === ')') {
							this.eat(')');
							return { type: 'GroupExpression', argument: null };
						}
						var expr = this.parseExpression();
						this.eat(')');
						return { type: 'GroupExpression', argument: expr };
					}

					if (token.value === '[') return this.parseArrayLiteral();
					if (token.value === '{') return this.parseObjectLiteral();

					// FIX: `...` spread at atom level (e.g., inside array literals when called
					//      directly — normally caught by parseMaybeUnary but guard here too)
					if (token.value === '...') {
						this.eat('...');
						return { type: 'SpreadElement', argument: this.parseMaybeUnary() };
					}

					//console.log('parseAtom failed at token:', token, this);
					throw new Error('Unexpected token: ' + token.value + ' at ' + token.line + ':' + token.column);
				};

				script_gen.prototype.parseFunctionExpression = function () {
					this.eat('function');
					var generator = false;
					if (this.peek().value === '*') { this.eat('*'); generator = true; }
					var id = null;
					if (this.peek().type === 'Identifier') id = { type: 'Identifier', name: this.eat().value };
					this.eat('(');
					var params = this.parseParamList();
					this.eat(')');
					var body = this.parseBlock();
					return { type: 'FunctionExpression', id: id, params: params, body: body, generator: generator };
				};

				script_gen.prototype.parseArrayLiteral = function () {
					this.eat('[');
					var elems = [];
					while (this.peek().value !== ']') {
						if (this.peek().value === ',') {
							elems.push(null); // elision / hole
							this.eat(',');
							continue;
						}
						// FIX: spread inside array literal
						if (this.peek().value === '...') {
							this.eat('...');
							elems.push({ type: 'SpreadElement', argument: this.parseAssignmentExpression() });
						} else {
							// FIX: use parseAssignmentExpression so nested commas don't eat siblings
							elems.push(this.parseAssignmentExpression());
						}
						if (this.peek().value === ',') this.eat(','); else break;
					}
					this.eat(']');
					return { type: 'ArrayExpression', elements: elems };
				};

				script_gen.prototype.parseObjectLiteral = function () {
					this.eat('{');
					var props = [];
					while (this.peek().value !== '}') {
						// FIX: spread inside object literal: { ...obj }
						if (this.peek().value === '...') {
							this.eat('...');
							props.push({ type: 'SpreadElement', argument: this.parseAssignmentExpression() });
							if (this.peek().value === ',') this.eat(','); else break;
							continue;
						}

						var computed = false;
						var isGet = false, isSet = false;
						var isGenerator = false;
						var isAsync = false;

						// async method shorthand
						if (this.peek().type === 'Identifier' && this.peek().value === 'async' && this.peekAt(1).value !== ':' && this.peekAt(1).value !== ',') {
							this.eat(); isAsync = true;
						}
						// generator method shorthand: * key() {}
						if (this.peek().value === '*') {
							this.eat(); isGenerator = true;
						}
						// get/set accessor shorthand
						if (!isAsync && !isGenerator && this.peek().type === 'Identifier' &&
							(this.peek().value === 'get' || this.peek().value === 'set') &&
							this.peekAt(1).value !== ':' && this.peekAt(1).value !== ',' && this.peekAt(1).value !== '(') {
							var accessor = this.eat().value;
							isGet = accessor === 'get';
							isSet = accessor === 'set';
						}

						var key;
						if (this.peek().value === '[') {
							// Computed property: { [expr]: val }
							this.eat('[');
							key = this.parseAssignmentExpression();
							this.eat(']');
							computed = true;
						} else if (this.peek().type === 'Number') {
							var numTok = this.eat();
							key = { type: 'Literal', value: Number(numTok.value), raw: numTok.value };
						} else if (this.peek().type === 'String') {
							var strTok = this.eat();
							key = { type: 'Literal', value: strTok.value, raw: strTok.value };
						} else if (this.peek().type === 'Identifier' || this.peek().type === 'Keyword') {
							key = { type: 'Identifier', name: this.eat().value };
						} else {
							key = { type: 'Literal', value: this.peek().value, raw: this.eat().value };
						}

						var value;
						var shorthand = false;

						if (this.peek().value === '(') {
							// Method shorthand: { foo() {} }
							this.eat('(');
							var params = this.parseParamList();
							this.eat(')');
							var body = this.parseBlock();
							value = {
								type: isAsync ? 'AsyncFunctionExpression' : 'FunctionExpression',
								id: null, params: params, body: body, generator: isGenerator
							};
						} else if (this.peek().value === ':') {
							this.eat(':');
							// FIX: use parseAssignmentExpression so commas don't eat sibling properties
							value = this.parseAssignmentExpression();
						} else {
							// Shorthand property: { a } same as { a: a }
							shorthand = true;
							value = { type: 'Identifier', name: key.name || key.value };
						}

						// Default value in destructuring-like shorthand: { a = 1 }
						if (shorthand && this.peek().value === '=') {
							this.eat('=');
							value = { type: 'AssignmentPattern', left: value, right: this.parseAssignmentExpression() };
						}

						props.push({
							type: 'Property',
							key: key,
							value: value,
							computed: computed,
							shorthand: shorthand,
							kind: isGet ? 'get' : isSet ? 'set' : 'init'
						});
						if (this.peek().value === ',') this.eat(','); else break;
					}
					this.eat('}');
					return { type: 'ObjectExpression', properties: props };
				};

			})();

			// --- CODE GENERATOR ---

			function generate_code(node) {
				var _this = this;
				if (!node) return '';

				// Extension override hook
				if (_this.extensions && _this.extensions[node.type]) {
					var res = _this.extensions[node.type](node, _this.generate_code.bind(_this));
					if (res !== false) return res;
				}
				try {
					switch (node.type) {

						case 'Program':
							return node.body.map(_this.generate_code.bind(_this)).join('\n');

						case 'BlockStatement':
							return '{\n' + node.body
								.filter(Boolean)
								.map(_this.generate_code.bind(_this))
								.map(function (s) { return '  ' + s; })
								.join('\n') + '\n}';

						case 'EmptyStatement':
							return ';';

						case 'DebuggerStatement':
							return 'debugger;';

						case 'LabeledStatement':
							return _this.generate_code(node.label) + ': ' + _this.generate_code(node.body);

						case 'ExpressionStatement':
							return _this.generate_code(node.expression) + ';';

						case 'VariableDeclaration': {
							var list = node.declarations.filter(Boolean);
							if (list.length === 0) return '';
							return node.kind + ' ' + list.map(_this.generate_code.bind(_this)).join(', ') + ';';
						}

						case 'VariableDeclarator':
							return _this.generate_code(node.id) + (node.init ? ' = ' + _this.generate_code(node.init) : '');

						// --- Binding patterns ---
						case 'ObjectPattern': {
							var parts = node.properties.map(function (p) {
								if (p.type === 'RestElement') return '...' + _this.generate_code(p.argument);
								var k = _this.generate_code(p.key);
								var v = _this.generate_code(p.value);
								if (p.shorthand) return v; // { a } or { a = 1 }
								return (p.computed ? '[' + k + ']' : k) + ': ' + v;
							});
							return '{ ' + parts.join(', ') + ' }';
						}

						case 'ArrayPattern': {
							var parts = node.elements.map(function (e) {
								if (!e) return '';
								if (e.type === 'RestElement') return '...' + _this.generate_code(e.argument);
								return _this.generate_code(e);
							});
							return '[' + parts.join(', ') + ']';
						}

						case 'AssignmentPattern':
							return _this.generate_code(node.left) + ' = ' + _this.generate_code(node.right);

						case 'RestElement':
							return '...' + _this.generate_code(node.argument);

						// --- Control flow ---
						case 'IfStatement': {
							var str = 'if (' + _this.generate_code(node.test) + ') ' + _this.generate_code(node.consequent);
							if (node.alternate) str += ' else ' + _this.generate_code(node.alternate);
							return str;
						}

						case 'ForStatement': {
							var init = node.init ? _this.generate_code(node.init).replace(/;$/, '') : '';
							return 'for (' + init + '; ' +
								(node.test ? _this.generate_code(node.test) : '') + '; ' +
								(node.update ? _this.generate_code(node.update) : '') + ') ' +
								_this.generate_code(node.body);
						}

						case 'ForInStatement': {
							var left = (node.left.type === 'VariableDeclaration')
								? node.left.kind + ' ' + node.left.declarations.map(_this.generate_code.bind(_this)).join(', ')
								: _this.generate_code(node.left);
							return 'for (' + left + ' in ' + _this.generate_code(node.right) + ') ' + _this.generate_code(node.body);
						}

						case 'ForOfStatement': {
							var left = (node.left.type === 'VariableDeclaration')
								? node.left.kind + ' ' + node.left.declarations.map(_this.generate_code.bind(_this)).join(', ')
								: _this.generate_code(node.left);
							return 'for (' + left + ' of ' + _this.generate_code(node.right) + ') ' + _this.generate_code(node.body);
						}

						case 'WhileStatement':
							return 'while (' + _this.generate_code(node.test) + ') ' + _this.generate_code(node.body);

						case 'DoWhileStatement':
							return 'do ' + _this.generate_code(node.body) + ' while (' + _this.generate_code(node.test) + ');';

						case 'SwitchStatement': {
							var cases = node.cases.map(_this.generate_code.bind(_this)).join('\n');
							return 'switch (' + _this.generate_code(node.discriminant) + ') {\n' + cases + '\n}';
						}

						case 'SwitchCase': {
							var label = node.test ? 'case ' + _this.generate_code(node.test) + ':' : 'default:';
							var cons = node.consequent
								.filter(Boolean)
								.map(_this.generate_code.bind(_this))
								.map(function (s) { return '  ' + s; })
								.join('\n');
							return label + (cons ? '\n' + cons : '');
						}

						case 'ReturnStatement':
							return 'return' + (node.argument ? ' ' + _this.generate_code(node.argument) : '') + ';';

						case 'BreakStatement':
							return node.label ? 'break ' + _this.generate_code(node.label) + ';' : 'break;';

						case 'ContinueStatement':
							return node.label ? 'continue ' + _this.generate_code(node.label) + ';' : 'continue;';

						case 'ThrowStatement':
							return 'throw ' + _this.generate_code(node.argument) + ';';

						case 'TryStatement': {
							var str = 'try ' + _this.generate_code(node.block);
							if (node.handler) {
								str += ' catch';
								if (node.handler.param) str += ' (' + _this.generate_code(node.handler.param) + ')';
								str += ' ' + _this.generate_code(node.handler.body);
							}
							if (node.finalizer) str += ' finally ' + _this.generate_code(node.finalizer);
							return str;
						}

						// --- Expressions ---
						case 'SequenceExpression':
							return node.expressions.map(_this.generate_code.bind(_this)).join(', ');

						case 'ConditionalExpression':
							return _this.generate_code(node.test) + ' ? ' +
								_this.generate_code(node.consequent) + ' : ' +
								_this.generate_code(node.alternate);

						case 'BinaryExpression':
						case 'LogicalExpression':
						case 'AssignmentExpression': {
							var left = _this.generate_code(node.left);
							var right = _this.generate_code(node.right);
							var prec = PRECEDENCE[node.operator] || 0;
							var leftPrec = (node.left.type === 'BinaryExpression' || node.left.type === 'LogicalExpression')
								? (PRECEDENCE[node.left.operator] || 0)
								: (node.left.type === 'ConditionalExpression') ? PRECEDENCE['?'] : 99;
							var rightPrec = (node.right.type === 'BinaryExpression' || node.right.type === 'LogicalExpression')
								? (PRECEDENCE[node.right.operator] || 0)
								: (node.right.type === 'ConditionalExpression') ? PRECEDENCE['?'] : 99;
							if (leftPrec < prec) left = '(' + left + ')';
							if (rightPrec < prec) right = '(' + right + ')';
							return left + ' ' + node.operator + ' ' + right;
						}

						case 'UnaryExpression':
							return node.operator + (node.operator.length > 1 ? ' ' : '') + _this.generate_code(node.argument);

						case 'UpdateExpression':
							return node.prefix
								? node.operator + _this.generate_code(node.argument)
								: _this.generate_code(node.argument) + node.operator;

						case 'SpreadElement':
							return '...' + _this.generate_code(node.argument);

						case 'CallExpression':
						case 'OptionalCallExpression': {
							var callee = _this.generate_code(node.callee);
							if (callee) {
								if (node.callee.type === 'FunctionExpression') callee = '(' + callee + ')';
								var op = node.optional ? '?.' : '';
								return callee + op + '(' + node.arguments.map(_this.generate_code.bind(_this)).join(', ') + ')';
							}
							else return '';
							
						}

						case 'MemberExpression':
						case 'OptionalMemberExpression': {
							var obj = _this.generate_code(node.object);
							if (node.object.type === 'BinaryExpression') obj = '(' + obj + ')';
							var op = node.optional ? '?.' : '.';
							if (node.computed) return obj + '[' + _this.generate_code(node.property) + ']';
							return obj + op + (node.property.name || node.property.value);
						}

						case 'FunctionDeclaration':
						case 'FunctionExpression':
						case 'AsyncFunctionExpression': {
							var isAsync = node.async || node.type === 'AsyncFunctionExpression';
							var p = node.params.map(_this.generate_code.bind(_this)).join(', ');
							var id = node.id ? ' ' + node.id.name : '';
							var gen = node.generator ? '*' : '';
							return (isAsync ? 'async ' : '') + 'function' + gen + id + '(' + p + ') ' + _this.generate_code(node.body);
						}

						case 'ArrowFunctionExpression': {
							var p = node.params.length === 1 && node.params[0].type === 'Identifier'
								? node.params[0].name
								: '(' + node.params.map(_this.generate_code.bind(_this)).join(', ') + ')';
							var async = node.async ? 'async ' : '';
							var body = node.expression ? _this.generate_code(node.body) : _this.generate_code(node.body);
							return async + p + ' => ' + body;
						}

						case 'ArrayExpression':
							return '[' + node.elements.map(function (e) {
								return e ? _this.generate_code(e) : '';
							}).join(', ') + ']';

						case 'ObjectExpression': {
							var props = node.properties.map(function (p) {
								if (p.type === 'SpreadElement') return '...' + _this.generate_code(p.argument);
								var k = p.computed
									? '[' + _this.generate_code(p.key) + ']'
									: (p.key.name !== undefined ? p.key.name : _this.generate_code(p.key));
								if (p.shorthand) return _this.generate_code(p.value);
								if (p.value && (p.value.type === 'FunctionExpression' || p.value.type === 'AsyncFunctionExpression')) {
									var fn = p.value;
									var isAsync = fn.async || fn.type === 'AsyncFunctionExpression';
									var gen = fn.generator ? '*' : '';
									var params = fn.params.map(_this.generate_code.bind(_this)).join(', ');
									return (p.kind === 'get' ? 'get ' : p.kind === 'set' ? 'set ' : '') +
										(isAsync ? 'async ' : '') + gen + k + '(' + params + ') ' + _this.generate_code(fn.body);
								}
								return (p.kind === 'get' ? 'get ' : p.kind === 'set' ? 'set ' : '') +
									k + ': ' + _this.generate_code(p.value);
							});
							return '{ ' + props.join(', ') + ' }';
						}

						case 'MetaProperty':
							return node.meta.name + '.' + node.property.name;

						case 'Literal':
							return node.raw !== undefined ? String(node.raw) : String(node.value);

						case 'Identifier':
							return _this.get_identifier ? _this.get_identifier(node.name, node) : node.name;

						case 'ThisExpression':
							return 'this';

						case 'GroupExpression':
							return node.argument ? '(' + _this.generate_code(node.argument) + ')' : '()';

						case 'NewExpression': {
							var callee = _this.generate_code(node.callee);
							return 'new ' + callee + '(' + node.arguments.map(_this.generate_code.bind(_this)).join(', ') + ')';
						}

						default:
							console.warn('generate_code: unknown node type', node.type, node);
							return '';
					}

				} catch (ee) {
					//console.log("node", node);
					throw ee;
				}

			}

			return {
				Parser: script_gen,
				generate: generate_code,
				generate_code: generate_code,
			};

		})();


		(function () {

			script_gen.reset = function (get_identifier, extensions) {
				this.get_identifier = get_identifier;
				this.extensions = extensions;
				return this;
			};

			script_gen.identifiers = [];
			script_gen.push_identifiers = function (get_identifier) {
				if (this.get_identifier) this.identifiers.push(this.get_identifier);
				this.get_identifier = get_identifier;
			};
			script_gen.pop_identifiers = function () {
				this.get_identifier = this.identifiers.pop();
			};

			script_gen.collect_nodes = function (node, type, clear) {
				var list = [];
				function process_node(node, parent, key) {
					if (!node) return;
					if (node.type === type) {
						list.push(node);
						if (clear) {
							if (Array.isArray(parent)) parent[key] = undefined;
							else delete parent[key];
						}
					}
					for (var k in node) {
						var child = node[k];
						if (Array.isArray(child)) {
							child.forEach(function (ch, i) { process_node(ch, child, i); });
						} else if (child && typeof child === 'object' && child.type) {
							process_node(child, node, k);
						}
					}
				}
				process_node(node);
				return list;
			};

			script_gen.apply_features = function (node, features) {
				function set_parent(res, parent, key) {
					if (res === true) {
						if (Array.isArray(parent)) parent[key] = undefined;
						else delete parent[key];
					} else if (res !== false) {
						parent[key] = res;
					}
				}
				function process_node(node, parent, key) {
					if (!node) return;
					for (var k in node) {
						var child = node[k];
						if (Array.isArray(child)) {
							child.forEach(function (ch, i) { process_node(ch, child, i); });
						} else if (child && typeof child === 'object' && child.type) {
							if (child.type === 'CallExpression' && features[child.callee && child.callee.name]) {
								var res = features[child.callee.name](child, node, k);
								set_parent(res, parent, key);
							}
							process_node(child, node, k);
						}
					}
				}
				if (features) process_node(node);
			};

		})();

		const bundle_features = {};
		let constants;
		const bundle_extensions = {}, entry_extensions = {};
		function get_identifier(name, node) {
			if (constants[name] !== undefined) {
				return constants[name];
			}
			return name;
		}
		bundle_features["constants$"] = function (node) {
			node.arguments.forEach(function (arg) {
			
				if (arg.type == "BinaryExpression") {
					constants[arg.left] = eval(script_gen.generate_code(arg.right));
				}
				else if (arg.type == "ObjectExpression") {
					arg.properties.forEach(function (p) {
						//	console.log("p.key", p.key)
						if (constants[p.key.name] && p.key.name.indexOf("$")>0) {							
							constants[p.key.name]+=eval(script_gen.generate_code(p.value));
						}
						else {
							constants[p.key.name] = eval(script_gen.generate_code(p.value));
            }
						

					//	console.log("constants$", p.key.name, constants[p.key.name]);
					})
				}

				
			});
			return true;
		};






		on_bundle.push((function () {

			return function (source, entry) {
				if (!entry) return source;
				return new Promise(function (resolve) {

					const sntry = entry.get_super_entry();
					sntry.wasms$ = sntry.wasms$ || [];
					sntry.packings$ = sntry.packings$ || [];
					sntry.blocks$ = sntry.blocks$ || {};
					sntry.__constants = sntry.__constants || {};
					sntry.__macros = sntry.__macros || {};
					sntry.__collects = sntry.__collects || {};
					const bundle_calls$ = {};
					bundle_extensions["CallExpression"] = function (node, print) {
						if (node.callee.type === 'Identifier') {
							let name = node.callee.name.trim();
							if (name == "bundle_calls$") {

								node.arguments.forEach(function (arg) {
									if (arg.type == "ObjectExpression") {
										arg.properties.forEach(function (p) {
											bundle_calls$[p.key.name] = new Function('return ' + script_gen.generate_code(p.value))();
											console.log(p.key.name, [bundle_calls$[p.key.name]]);

										});
									}
								});
								return '';
							}
							else if (bundle_calls$[name]) {
								return bundle_calls$[name](node,sntry,print);
              }
						}

						return false;
					};

					script_gen.reset(get_identifier, bundle_extensions);
				
					constants = sntry.__constants;
					_bundle_features = sntry.__bundle_features;
					sntry.__packages.forEach(function (p) {
						const e = packing.loaded[p];
						if (e && e.__constants) {
							for (let k in e.__constants) {
								constants[k] = e.__constants[k];
              }

            }

          })

					macros = sntry.__macros;
					collects = sntry.__collects;
					
					
					const scp = new script_gen.Parser(source);
					const ast = scp.parseProgram();
					script_gen.apply_features(ast, bundle_features);
					
					
					entry.__ast = ast;
					entry.__source = script_gen.generate(ast);

					const sconstants = Object.keys(constants).map(function (k) {
						return [k, constants[k], new RegExp(k.replace("$", ""), "g")];

					}).sort(function (a,b) {
						return b[0].length - a[0].length;
					});
					console.log("constants ", [constants]);
				


					const tasks = [];

					


					if (sntry.packings$.length > 0) {
						sntry.packings$.forEach(function (node, i) {
							tasks.push(function () {
								return new Promise(function (packing_complete) {
									node.callee.callee.name = "return packing.export_bundle";									
									let letime = Date.now();
									const fsource = script_gen.generate_code(node);
									//console.log(fsource);
									(new Function(fsource)()({
										__constants: sntry.__constants,
										wbuild: sntry.wbuild
									})).then(function (bun) {
										entry.__source = entry.__source.replace('packing___' + (i + 1) + '()', bun);
										console.log("sntry.packings$", Date.now() - letime);
										packing_complete();
									});
								})

							});
						});

					}

					
					//console.log(entry.__name, "sntry.wasms$.length", sntry.wasms$.length,Date.now());
					//console.log("sntry.wasms$", sntry.wasms$);
					if (sntry.wasms$.length > 0 && sntry.wbuild) {
						sntry.wasms$.forEach(function (source, i) {
							tasks.push(function () {
								return new Promise(function (wasm_complete) {
									//console.log("sntry.wasms$ ", i, [source]);
									sconstants.forEach(function (a) {
										source = source.replace(a[2], a[1]);
									});
									
									parse_include(source, entry, entry.__base_folder, function (source) {
										
										sconstants.forEach(function (a) {
											source = source.replace(a[2], a[1]);
										});

										sconstants.forEach(function (a) {
											source = source.replace(a[2], a[1]);
										});
										console.log(source);
										const hsource = hash_str(source);
									
										const file = "whashes/" + hsource + ".js";

										get_file("/exist?" + file, "text").then(function (res) {
											//console.log("wasms$", [file,res])
											if (res == "true") {
												get_file("/get?" + file, "text").then(function (compiled) {
													entry.__source = entry.__source.replace('wasm___' + (i + 1) + '()', compiled);
													//get_file("/put?" + file, "text", compiled);
													wasm_complete();
												});
											}
											else {
												sntry.wbuild.compile_ccp(sntry, source).then(function (compiled) {
													entry.__source = entry.__source.replace('wasm___' + (i + 1) + '()', compiled);
													get_file("/put?" + file, "text", compiled);
													wasm_complete();
												})
                      }


										});
										

									}, "#include");



								})

							});
						});
					}
			
					Object.keys(sntry.blocks$).forEach(function (ke) {
						const blk = sntry.blocks$[ke];
						let blk_source = blk.map(function (node) {
							return node;
						}).join('\n');
						sconstants.forEach(function (a) {
							blk_source = blk_source.replace(a[2], a[1]);
						});
						entry.__source = entry.__source.replace('call_blk_' + ke + '()', blk_source);

					});
					
					if (tasks.length > 0) {
					//	console.log("tasks", tasks);
						each(function (next_task, i) {
							if (i > tasks.length - 1) {
								resolve(entry.__source);
								return;
							}
							tasks[i]().then(function () {
								next_task(i + 1);
							});
            })
          }
					else {
						resolve(entry.__source);
					}

				});


			}


		})());
		const entry_features = {};
    function compile_entry(entry) {
			const sntry = entry.get_super_entry();
		
			
			return new Promise(function (resolve) {
				const source = entry.toString();
				
				parse_include(source, entry, entry.__base_folder, function (source) {

					sntry.packings$ = sntry.packings$ || [];
					sntry.wasms$ = sntry.wasms$ || [];
					sntry.wasms_names$ = sntry.wasms_names$ || {};
					sntry.blocks$ = sntry.blocks$ || {};
					entry_extensions["CallExpression"] = function (node, print) {
						if (node.callee.type === 'Identifier') {
							let name = node.callee.name.trim();
							if (name == "wasm$") {
								let name = node.arguments[0].raw;

								if (sntry.wasms_names$[name] !== undefined) {
									name = sntry.wasms$[sntry.wasms_names$[name]];
								}
								else {
									name = eval(name);
									if (node.arguments[1]) {
										sntry.wasms_names$[node.arguments[1].raw] = sntry.wasms$.length ;
									}
								}
								sntry.wasms$.push(name);

								

								return 'wasm___' + sntry.wasms$.length + '()';
							}
							else if (name == "wasm_add$") {
								const name = node.arguments[0].raw;
								if (sntry.wasms_names$[name] !== undefined) {
									sntry.wasms$[sntry.wasms_names$[name]] += ('\n' + eval(node.arguments[1].raw));
								}
								return '';
							}
							else if (name == "packing$") {
								sntry.packings$.push(node.arguments[0]);								
								return 'packing___' + sntry.packings$.length + '()';
							}
							else if (name == "block$") {
								const arg = node.arguments[0];
								console.log("block$", arg);
								if (arg.type == "Literal") {
									name = eval(arg.raw);
									sntry.blocks$[name] = sntry.blocks$[name] || [];
									return 'call_blk_' + name +'()';
								}
								else if (arg.type == "FunctionExpression") {
									name = arg.id.name.trim();
									sntry.blocks$[name] = sntry.blocks$[name] || [];
									sntry.blocks$[name].push(script_gen.generate_code(arg.body));
									return '';
								}
								
								
								
							}
						}

						return false;
					};

					script_gen.reset(undefined, entry_extensions);


					const scp = new script_gen.Parser(source);
					const ast = scp.parseProgram();

					source = script_gen.generate(ast);



					entry.__source = source;
					loaded[entry.__name] = entry;
					script_gen.apply_features(ast, entry_features);

					entry.__args = ast.body[0].params.map(function (p) { return p.name; });
					//console.log("compile_entry", entry.__name, ast);
					resolve(entry.__source);




				});
        
      })

    };

    return compile_entry;

  })();


  function wait_loading(name) {
    return new Promise(function (res) {
      function wait() {
        if (loaded[name] || loaded[loading[name]]) return res();
        setTimeout(wait, 20);
      }
      wait();
    });
	}

  function process_dep() {
    const entry = this;
    let dep = entry.___deps.pop();

   // console.log("dep", entry.__name, [entry,dep]);
    if (dep === undefined) {
      if (entry.__base_url) urlsnames[entry.__base_url] = entry.__name;
      if (entry_loaded(entry.__name)) {
        if (entry.__parent_entry !== undefined) {
          if (entry.__name !== '' && !entry.__is_child) {
            entry.__super_entry.__packages.push(entry.__name);
          }

          process_dep.apply(entry.__parent_entry);
        }
        return;
      };
      compile_entry(entry).then(function (source) {
      
        if (entry.__parent_entry !== undefined) {
          if (entry.__name !== '' && !entry.__is_child) entry.__parent_entry.__packages.push(entry.__name);
          process_dep.apply(entry.__parent_entry);
        }
        else if (entry.__caller) {
       //   console.log("completed", entry.__name);

          entry.__caller.__packages.push(entry.__name);
          process_dep.apply(entry.__caller);
        }
        else {
          export_entry(entry).then(function (bundle) {
            entry.__super_entry.on_bundle.forEach(function (BB) {
              bundle = BB(bundle);
            });
            bundle = bundle.replace(/\n\s*\n\s*\n/g, '\n\n');

            if (entry.__bundle_resolver) {
              entry.__bundle_resolver(bundle);
            }
            else {
              if (is_browser)
                packing.execute_bundle(bundle, entry);
              else
                entry.__exported_bundle = bundle;

            }
          });
        }
      });
      return;
    }

    if (dep == "packing") {
      entry.__super_entry.__include_packing = true;
      process_dep.apply(entry);
      return;
    }
    if (loaded[dep]) {
      entry.__packages.push(dep);
      process_dep.apply(entry);
      return;
    }

    else if (loaded[urlsnames[dep]]) {
      dep = urlsnames[dep];
      entry.__packages.push(dep);
      process_dep.apply(entry);
      return;
    }
    else if (loading[dep]) {

      if (entry.__parent_entry) {
        if (dep === entry.__parent_entry.__name) {
          return process_dep.apply(entry);
        }
      }
      wait_loading(dep).then(function () {
        entry.__packages.push(loading[dep]);
        process_dep.apply(entry);
      });
      return;
    }
    else if (loading[urlsnames[dep]]) {
      dep = urlsnames[dep];
     // console.log("wait for ", dep, entry.__name);
      wait_loading(dep).then(function () {
        entry.__packages.push(dep);
        process_dep.apply(entry);
      });
      return;
    }
    else if (!entry.__is_child && registry[dep]) {
      return entry.process_child_entry(cache[dep], [], dep);
    }


    if (is_function(dep)) {
      if (dep.create_source) {
        entry.process_child_entry(dep(), [], dep);

        return;
      }
      const resp = dep(entry);
      if (resp instanceof Promise) {
        resp.then(function () {
          process_dep.apply(entry);
        });
      } else {
        process_dep.apply(entry);
      }
      return;
    }
    else if (is_object(dep)) {
      Object.assign(entry, dep);
      process_dep.apply(entry);
      return;
    }
    else if (dep instanceof Promise) {
      dep.then(function () {
        process_dep.apply(entry);
      });
      return;
    }

    else if (is_string(dep)) {
      // console.log("dep", dep);

      if (loaded[dep]) {
        if (entry.__caller) {
          entry.__caller.__packages.push(entry.__name);
          return process_dep.apply(entry.__caller);
        }
      }
      else if (test_dep_js.test(dep)) {
        //console.log("fetching", dep);
        loading[dep] = true;
        entry.__super_entry.__packages_urls.push(dep);
        entry.__resolve(entry.__resolve_path(dep)).then(function (source) {
          entry.loading_url = dep;
          (new Function("__args", "packing", source))([], entry.__load_child_entry);
        });
      }
      else if (registry[dep]) {
        entry.process_child_entry(cache[dep], [], dep);
      }
      else {
        entry.__resolve(entry.__resolve_path(dep), "arraybuffer").then(function () {
          process_dep.apply(entry);
        });
      }
      return;
    }
    else if (Array.isArray(dep)) {

      if (dep.length == 1) {
        if (registry[dep[0]]) {
          return entry.process_child_entry(cache[dep[0]], dep.splice(1), dep);
        }

        if (is_string(dep[0]) && test_dep_js.test(dep[0])) {
          loading[dep[0]] = true;
         // console.log("fetching", dep[0]);
          entry.__resolve(entry.__resolve_path(dep[0])).then(function (source) {
            entry.loading_url = dep[0];
            entry.process_child_entry('(function(){  ' + source.trim() + '})()', dep.splice(1), dep);
          });
        }

        else if (registry[dep[0]]) {
          return entry.process_child_entry(cache[dep[0]], dep.splice(1), dep);
        }
      }
      else if (dep.length > 1) {
        if (is_function(dep[1])) {
          entry.__resources[dep[0]] = dep[1];
          process_dep.apply(entry);
          return;
        }

        else if (is_string(dep[1])) {
          entry.__resolve(entry.__resolve_path(dep[1]), dep[2] || "arraybuffer").then(function (data) {
            entry.__resources[dep[0]] = data;
            process_dep.apply(entry);
          });
        }
        else {
          entry.__resources[dep[0]] = dep[1];
          process_dep.apply(entry);
        }
      }



    }
    else {
      if (registry[dep]) {
        entry.process_child_entry(cache[dep], [], dep);
      }
      else {
        entry.__resolve(entry.__resolve_path(dep), "arraybuffer").then(function () {
          process_dep.apply(entry);
        });
      }

    }
  }

	packing = function () {


		const deps = arguments_to_array(arguments).reverse();
		let caller, loading_url;

		if (this.___deps) {
			caller = this;
		}
		loading_url = this.loading_url;

		let parent_entry = undefined;
		if (this.__uuid !== undefined) {
			parent_entry = this;
		}
		return function (name, entry) {


			if (entry === undefined) {
				entry = name;
				name = undefined;
			}
			if (entry === undefined) entry = function () { };



			entry.get_super_entry = function () {
				if (this.__super_entry.__uuid === this.__uuid) return this;
				return this.__super_entry.get_super_entry();
			};

			let aliases;
			if (Array.isArray(name)) {
				aliases = name;
				name = name[0];
				aliases.splice(0, 1);
			}
			if (parent_entry !== undefined) {
				if (loaded[name]) {
					parent_entry.__super_entry.__packings.push(name);

					process_dep.apply(parent_entry);
					return;
				}
			}

			entry.__uuid = guidi();
			entry.___deps = deps;
			entry.__no_deps = entry.___deps.length < 1;
			name = name || ("P" + entry.__uuid);
			entry.__name = name;
			entry.__caller = caller;

			if (entry_loaded(entry.__name)) {
				if (caller) {
					entry.__caller.__packings.push(entry.__name);

					process_dep.apply(entry.__caller);
					return;
				}
			}


			entry._require = _require;
			entry.__parent_entry = undefined;
			entry.__packages = [];
			entry.__resources = {};
			entry.__resolvers = {};
			entry.__store = {};
			entry.__resolve = resolve_resource;
			entry.on_bundle = on_bundle; //[];
			entry.__packages_urls = [];
			entry.__is_child = false;
			entry.__children = [];
			entry.compilers = packing.compilers;
			entry.__compressed = false;
			entry.__aliases = aliases || [];
			entry.__base_url = loading_url || "";
			entry.__resolve_path = resolve_path;
			entry.__super_entry = entry;

			entry.FS$ = function (func) {
				let s = func.toString();
				let i = s.indexOf("{")+1;
				return s.substr(i, s.length - i-1).trim();
			};


			if (parent_entry) {
				entry.__super_entry = parent_entry.__parent_entry || parent_entry;
				if (name.indexOf(".") > 0) {
					if (name.substr(0, name.indexOf(".")) === parent_entry.__name) {
						entry.__parent_entry = parent_entry;
						entry.__is_child = true;
						entry.__parent_uuid = parent_entry.__uuid;
						entry.__base_url = parent_entry.__base_folder + entry.__base_url;
						parent_entry.__children.push(name);
					}

				}
			}

			entry.__base_folder = entry.__base_url.replace(entry.__base_url.replace(/^.*[\\\/]/, ''), "").replace("@", root_url);


			loading[entry.__name] = entry.__name;
			entry.__aliases.forEach(function (a) {
				loading[a] = entry.__name;
			});
			loading[entry.__base_url] = entry.__name;
			entry.__load_child_entry = function () {
				return packing.apply(entry, arguments);
			};


			entry.__load_child_entry.loaded = packing.loaded;
			entry.__load_child_entry.remove_packings = packing.remove_packings;
			entry.__load_child_entry.bundle = packing.bundle;
			entry.__load_child_entry.run_bundle = packing.run_bundle;
			entry.__load_child_entry.keywords = packing.keywords;
			entry.__load_child_entry.compilers = packing.compilers;
			entry.__load_child_entry.cache = packing.cache;
			entry.__load_child_entry.registry = packing.registry;
			entry.__load_child_entry.each = packing.each;
			entry.__load_child_entry.sleep = packing.sleep;
			entry.__load_child_entry.wait_loading = packing.wait_loading;
			entry.__load_child_entry.register = packing.register;
			entry.__load_child_entry.str_hash = packing.str_hash;


			entry.__load_child_entry.save_retores_state = function () { };


			entry.__load_child_entry.str_to_base64 = packing.str_to_base64;
			entry.__load_child_entry.base64_to_str = packing.base64_to_str;

			entry.__load_child_entry.get_super_entry = function () {
				if (entry.__super_entry.__uuid === entry.__uuid) return entry;
				return entry.__super_entry.get_super_entry();
			};

			entry.get_bundle = function () {
				return new Promise(function (__bundle_resolver) {

					if (entry.__exported_bundle) {
						return __bundle_resolver(entry.__exported_bundle);
					}
					entry.__bundle_resolver = __bundle_resolver;

				});
			};

			entry.execute_bundle = function (helement, params) {
				return new Promise(function (resolve) {
					entry.__bundle_resolver = function (bundle) {
						resolve(packing.execute_bundle(bundle, helement, params));
					};
				});
			};
			entry.process_child_entry = function (source, args, dep) {
				(new Function("__args", "packing", source))(args || [], this.__load_child_entry);

			};

			entry.get_html_element = function (params) {

				const dv = document.createElement("div");
				dv.style.width = "100%";
				dv.style.height = "100%";




				return new Promise(function (resolve) {
					entry.__bundle_resolver = function (bundle) {
						packing.execute_bundle(bundle, dv, params);
						delete loaded[entry.__name];
						resolve(dv);
					}
				})

			}

			process_dep.apply(entry);



			return entry;


		}



	}


  function remove_entry(e) {
   // console.log("removing", e.__name, e.__children.join());


    delete loaded[e.__name];
    delete loading[e.__name];
    delete loading[e.__base_url];
    delete urlsnames[e.__name];
    delete urlsnames[e.__base_url];
    delete registry[e.__name];
    delete cache[e.__base_url.replace("@", "")];
    e.__children.forEach(function (n) {

      let e = loaded[n];
      if (e) {
       // console.log("rc", n, [e]);

        delete loaded[e.__name];
        delete loading[e.__name];
        delete loading[e.__base_url];
        delete urlsnames[e.__name];
        delete urlsnames[e.__base_url];
        delete registry[e.__name];

      }


      // delete urlsnames[n];
    })
  }



  function save_retores_state(restore, with_cache) {

    if (restore) {
      const state = save_retores_state.states.pop();
      restore_object(loaded, state['loaded']);
      loaded[true] = false;
      restore_object(loading, state['loading']);
      restore_object(keywords, state['keywords']);
      restore_object(urlsnames, state['urlsnames']);
      //constants.replacer = state['constants'];
			if (state['cache']) restore_object(cache, state['cache']);
			//console.log("retores_state", state);
    }
    else {
      const state = {};
      state['loaded'] = empty_object(loaded);
      state['loading'] = empty_object(loading);
      state['keywords'] = empty_object(keywords);
      state['urlsnames'] = empty_object(urlsnames);
      //state['constants'] = _constants.replacer.slice();
      if (with_cache) {
        state['cache'] = {};
        Object.assign(state['cache'], cache);

			}
			//console.log(loaded, loading, keywords, urlsnames);
			//console.log("save_state", state);

      save_retores_state.states.push(state);
    }

  }
  save_retores_state.states = [];

  packing.save_retores_state = save_retores_state;


  packing.export_bundle = function () {
    const self = this;
    const args1 = arguments_to_array(arguments);
    //this.loading_url = "";
    return function () {

      const args2 = arguments_to_array(arguments);
      return function (ext) {
        save_retores_state(false,!true);
        return new Promise(function (resolve) {
					const entr = packing.apply(self, args1).apply(self, args2);
					if (ext) Object.assign(entr, ext);
          entr.get_bundle().then(function (b) {

            save_retores_state(true,!true);
            resolve(b);
          });


        });
      }
    }
  };


  packing.run_bundle = function () {
    const self = this;
    //this.loading_url = "";
    const args1 = arguments_to_array(arguments);
    return function () {
      const args2 = arguments_to_array(arguments);
      return function (entry) {
        save_retores_state();
        return new Promise(function (resolve) {
          const entr = packing.apply(self, args1).apply(self, args2);
          save_retores_state(true);
          entr.execute_bundle().then(function (b) {
            resolve(b);
          });
        });
      }
    }
  };

  packing.execute_bundle = function (bundle, helement, params) {
		const resp = (new Function("packing", "require", "helement", "params", "return " + bundle))(packing, _require, helement, params);
    return resp;
  };



  packing.remove_entries = function () {
    let names = arguments_to_array(arguments);
    if (Array.isArray(names[0])) {
      names = names[0];
    }
    names.forEach(function (n) {
      if (loaded[n]) {
        remove_entry(loaded[n]);
      }
    });
  }

  packing.remove_package = function (url) {
    for (let name in loaded) {
      if (loaded[name].__base_url === url) {
        packing.remove_entries(name);
      }
    }
  };

  packing.globals = globals;
  packing.on_bundle = on_bundle;
  packing.wait_loading = wait_loading;
  packing.cache = cache;
  packing.compilers = compilers;
  packing.keywords = keywords;
  packing.loaded = loaded;
  packing.registry = registry;
  packing.sleep = sleep;
  packing.loading = loading;
  packing.urlsnames = urlsnames;
  packing.str_to_base64 = str_to_base64;
  packing.base64_to_str = base64_to_str;


	packing.register = function (name, func) {
		cache[name] = '(' + func.toString() + ')()';
		registry[name] = name;
	};


	packing.register("guid", function () {
		packing()("guid", function () {
			let guidCounter = 0;
			function create() {
				return (1024 + guidCounter++);
			};
			
			
			create.new = function (prefix) {
				prefix = prefix || "";
				let guidCounter = 0;
				return function () {
					return prefix + (Date.now() + guidCounter++);
				}
			}

			return create;

		});
	});

	packing.register("http", function () {
		packing()("http", function () {
			const http = require('http');
			const fs = require('fs');
			const path = require('path');
			const str_hash = function (str) {
				str = str.toString();
				let hash = 0, i, chr;
				if (str.length === 0) return hash;
				for (i = 0; i < str.length; i++) {
					chr = str.charCodeAt(i);
					hash = ((hash << 5) - hash) + chr;
					hash |= 0;
				}
				return hash + (2147483648);
			};

			const arguments_to_array = function (args) {
				let arr = [];
				args = args || [];
				for (let i = 0; i < args.length; i++)
					arr.push(args[i]);

				return arr;

			};

			this.serve = (function () {
				const MIME_TYPES = {
					default: 'application/octet-stream',
					json: 'application/json',
					html: 'text/html; charset=UTF-8',
					js: 'application/javascript; charset=UTF-8',
					css: 'text/css',
					png: 'image/png',
					jpg: 'image/jpg',
					gif: 'image/gif',
					ico: 'image/x-icon',
					svg: 'image/svg+xml',
					wasm: 'application/wasm',

				};
				return function (host, port, root_url) {

					const url = require('url');
					const server = http.createServer();
					server.root_dir = root_url || process.cwd();

					let i, route;

					server.on_request_upgrade = function (req, socket, head) {

					};
					server.on('upgrade', function (req, socket, head) {
						server.on_request_upgrade(req, socket, head);
					});

					server.routes = [];
					server.set_route = function (method, rg, cb) {
						for (i = 0; i < this.routes.length; i++) {
							route = this.routes[i];
							if (route[0] === method && route[1] === rg) {
								route[2] = cb;
								return;
							}
						}
						this.routes.push([method, rg, cb]);
					}
					server.gets = {};
					server.get = function (name) {
						if (name instanceof RegExp) {
							return this.set_route("GET", name, arguments_to_array(arguments));
						}
						this.gets[name] = arguments_to_array(arguments);
					};
					server.posts = {};
					server.post = function (name) {
						if (name instanceof RegExp) {
							return set_route("POST", name, arguments_to_array(arguments));
						}
						this.posts[name] = arguments_to_array(arguments);

					};
					server.cbody = [];
					server.chunk = function (chunk) {
						this.server.cbody[this.server.cbody.length] = chunk;
					};
					server.end = function () {
						this.body_buffer = Buffer.concat(this.server.cbody);
						this.server.cbody.length = 0;
						this.server = undefined;
					};
					server.complete = function (val) {
						if (val) this.res.end(val);
						this.req.waiting = false;
						this.free();
						return this;
					}
					server.status = function (code, text) {
						this.res.statusCode = code;
						if (text) {
							this.res.end(text);
						}


						return this;
					};
					server.header = function (name, value) {
						this.res.setHeader(name, value);
						return this;
					};

					server.mime = function (fn) {
						this.content_type(MIME_TYPES[path.extname(fn).substring(1).toLowerCase()]);
					}
					server.content_type = function (type) {
						this.header("Content-Type", type || MIME_TYPES.default);
						return this;
					};
					server.release = function () {
						this.waiting = false;
						return this;
					};
					server.file = function (fn) {
						if (fs.existsSync(fn)) {
							this.content_type(MIME_TYPES[path.extname(fn).substring(1).toLowerCase()]);
							this.header("Accept-Ranges", "bytes");


							fs.createReadStream(fn).pipe(this.res);
						}
						else {
							this.status(404).complete("Not found");
						}


					};

					server.json = function (j) {
						this.content_type(MIME_TYPES.json).complete(JSON.stringify(j));
					};

					server.free = function () {
						if (this.req.waiting) return;
						this.req = undefined;
						//this.res = undefined;
						this.cb = undefined;
					};
					let ret;
					server.next = function () {
						this.index++;
						if (this.index < this.cb.length) {
							ret = this.cb[this.index](this.req, this.res, this);
							if (ret === false) {
								this.index = Infinity;
								this.res.end();
								this.free();
							}
							if (ret == true) {
								this.req.waiting = true;
							//	console.log("waiting for server complete");
								return;
							}
						}
						else {
							this.res.end();
						}


						if (ret !== true) {
							if (this.cb && this.index + 1 == this.cb.length) {
								this.free();
							}
						}


					};

					let _url;
					server.on('request', function (req, res) {
						_url = url.parse(req.url, true);



						if (_url.pathname.indexOf("com.chrome.devtools") > 0) {
						//	console.log("request", _url.pathname);
							//server.status(404, "Bad request " + req.url);
							res.end();
							return;
						}

						if (_url.search) req.search = _url.search.replace("?", "");

						server.req = req;
						server.res = res;
						if (req.method === "GET") {
							server.cb = server.gets[_url.pathname];
						}
						else if (req.method === "POST") {
							server.cb = server.posts[_url.pathname];
						}

						if (!server.cb) {
							for (i = 0; i < server.routes.length; i++) {
								route = server.routes[i];
								if (route[0] === req.method) {
									if (route[1].test(_url.pathname)) {
										server.cb = route[2];

									}
								}
							}

						}

						if (server.cb) {

							res.statusCode = 200;
							req.url = _url;
							if (req.method === "POST") {
								server.cbody.length = 0;
								req.server = server;
								req.on('data', server.chunk);
								req.on('end', server.end);
							}

							server.index = 0;
							server.next();
						} else {
							server.status(404, "Bad request " + req.url).complete();
						}

					});


					server.cors = function (req, res, server) {

						res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
						res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
						res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
						res.setHeader("Access-Control-Allow-Origin", "*");
						res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
						res.setHeader("Access-Control-Max-Age", 2592000);
						if (req.method === 'OPTIONS') {

							res.end();

						}
						server.next();
					};

					server.static_files = function (req, res, server) {


						server.file(path.resolve(server.root_dir + req.url.pathname));
					}

					server.get(/.*\.js|.*\.html|.*\.*/, server.cors, server.static_files);


					server.get(/.*\.jh/, server.cors, function (req, res, server) {
						const jname = req.url.pathname.replace(".jh", ".js");
						server.complete('<!DOCTYPE html><html><head><meta charset="utf-8" /><title>' + req.url.pathname + '</title><script src="/packing.js"></' + 'script><' + 'script src="' + jname + '"></' + 'script></head><body style="padding:0;margin:0;overflow:hidden;width:100vw;height:100vh"><img src="" id="test_tile" style="position:absolute;display:none"/></body></html>');
					});

					const hash_executed = {};
					server.get(/.*\.func/, server.cors, function (req, res, server) {
						const fn = path.resolve(server.root_dir + req.url.pathname.replace(".func", ".js"));
						if (fs.existsSync(fn)) {
							const source = fs.readFileSync(fn).toString();
							
							let hash = str_hash(source);
							if (hash_executed[hash]) return res.end("");
							try {
							
								const F = (new Function('packing', 'server', 'require', 'return ' + source))(packing, server, require)();
								hash_executed[hash] = true;
							
								res.end("hash executed");
							}
							catch (err) {
								throw err;
							}
						}
					});





					server.require = require;

					server.post("/func", (function () {
						
						return function (req, res) {
							req.on('end', () => {
								const source = req.body_buffer.toString();
								let hash = str_hash(source);

								if (hash_executed[hash]) return res.end("");
							//	console.log("hash", hash);
								console.log(source);
								try {
									packing.save_retores_state(false, true);
									const F = (new Function('packing', 'server', 'require', 'return ' + source))(packing, server, require)();
								
									hash_executed[hash] = true;
									if (F && F.get_bundle) {
										F.get_bundle().then(bundle => {
											(new Function("require", "packing", bundle))(require, packing);
											packing.save_retores_state(true);


											return
										});
									}
									else packing.save_retores_state(true);
									res.end("updated");
								}
								catch (err) {
									throw err;
								}
							});
						}

					})());


					server.host = host;
					server.port = port;
					server.fs = fs;
					setTimeout(function () {
						console.log(host, port, server.root_dir);
						server.listen(port, host);

					}, 50);

					return server;
				}

			})();

			return this;
		});
	});

	packing.register("http.basic_server", function () {

		packing("http")("http.basic_server", function (http) {

			http.basic_server = function (s) {
				s = s || "default";
				const p = (function () {
					if (s == "default") {
						return ["0.0.0.0", "8091"];
					}
					return s.split(":");
				})();
				const server = http.serve(p[0], parseInt(p[1]));

				server.get("/get", function (req, res) {
					server.file(decodeURIComponent(req.search));
				});

				server.get("/exist", function (req, res) {
					res.end(server.fs.existsSync(decodeURIComponent(req.search)) ? "true" : "false");

				});

				const exec = require('child_process').exec;

				server.get("/cmdline", function (req, res) {
					console.log("cmdline", decodeURIComponent(req.search));
					exec(decodeURIComponent(req.search), function (error, stdout, stderr) {
						if (stderr) return res.end(stderr);

						res.end(stdout);
					});
				});


				server.get("/pipe", (function () {
					const http = require('http');
					const https = require('https');
					return function (req, res) {
						const url = decodeURIComponent(req.search);
						if (url.indexOf('http://') == 0) {

							http.get(url, function (r) {
								r.pipe(res);
							});

						}
						else if (url.indexOf('https://') == 0) {
							https.get(url, function (r) {
								r.pipe(res);
							});
						}
					}
				})());


				server.post("/put", (function () {
					return function (req, res) {
						req.on('end', function () {
							try {
								const put_file = decodeURIComponent(req.search);
								server.fs.mkdirSync(require('path').dirname(put_file), { recursive: true });
								server.fs.writeFileSync(put_file, req.body_buffer);
								res.end("completed");
							} catch (err) {
								throw err;
							}
						});
					}
				})());

				return server;
			}

		});
	});

	packing.register("httprequest", function () {

		packing()("httprequest", function () {
			const httprequest = this;
			const each = function (callback, index) {
				const func = function (index) {
					callback(func, index);
				};
				func(index || 0);
			};

			//@cmdline get_url get_urls http_func

			if (typeof XMLHttpRequest != "undefined") {



				httprequest.get_url = function (url, type, post_data, content_type) {

					//console.log("httprequest", url);
					return new Promise(function (resolve) {
						const xtp = new XMLHttpRequest();
						xtp.onload = function () {
							resolve(this.response);
							this.abort();
						};
						xtp.onerror = function () {
							console.log("onerror", this.response);
						};
						xtp.responseType = type || "text";

						if (post_data) {
							xtp.open("POST", url, !0);
							if (content_type)
								xtp.setRequestHeader('Content-Type', content_type);
							else {
								xtp.setRequestHeader('Content-Type', 'application/octet-stream');
							}
							xtp.send(post_data);
						}
						else {

							xtp.open("GET", url, true);
							xtp.send();
						}

					});
				};

				httprequest.get_urls = function (urls, type) {
					return new Promise(function (completed) {
						if (Array.isArray(urls)) {
							const loaded = [];
							each(function (next, i) {
								if (i > urls.length - 1) {
									completed(loaded);
									return;
								}
								else {
									if (Array.isArray(urls[i])) {
										httprequest.get_url(urls[i][0], urls[i][1]).then(function (data) {
											loaded[i] = data;
											next(i + 1);
										});
									}
									else {
										httprequest.get_url(urls[i]).then(function (data) {
											loaded[i] = data;
											next(i + 1);
										});
									}

								}
							});

						}
						else {
							httprequest.get_url(urls, type).then(function (data) {
								completed(data);
							});
						}




					});
				};

				httprequest.http_func = function (func, url) {
					return httprequest.get_url(url || "/func", undefined, func.toString(), 'text/plain');
				};

				

				httprequest.enable_chunk_files = function (furl) {
					httprequest.http_func(function () {
						server.post("/writechunk", (function () {
							const chunk_size = new Uint32Array(1);
							const chunk_size_u8 = new Uint8Array(chunk_size.buffer);
							const chunk_header = new Uint32Array(3);
							const chunk_header_u8 = new Uint8Array(chunk_header.buffer);


							const open_sessions = {};
							let pos = 0, red;

							let buff_size = 1024 * 32;

							const buff = new Uint8Array(buff_size);
							const buffers = [buff];

							let bi = 0;


							server.get("/getchunkslist", function (req, res) {
								const filename = decodeURIComponent(req.search);
								let fh = open_sessions[filename];
								if (!fh) {
									fh = server.fs.openSync(filename, "r+");
									open_sessions[filename] = fh;
								}
								pos = 0;
								server.content_type();

								while (red = server.fs.readSync(fh, chunk_header_u8, 4, 8, pos) > 0) {
									chunk_header[0] = pos + 4;
									//console.log("ch", chunk_header[0], chunk_header[1]);
									pos += (chunk_header[1] + 4);
									res.write(chunk_header_u8.slice());
								}
								console.log("filename completed", filename);
								server.complete();
								res.end();
							});

							let read_size = 0;
							server.get("/readchunk", function (req, res) {
								const args = decodeURIComponent(req.search).split("!!")

								let fh = open_sessions[args[0]];
								if (!fh) {
									fh = server.fs.openSync(args[0], "r+");
									open_sessions[args[0]] = fh;
								}
								pos = parseInt(args[1]);
								server.content_type();
								read_size = parseInt(args[2]);
								bi = 0;
								let buff = buffers[bi++];
								if (read_size < buff_size) {
									red = server.fs.readSync(fh, buff, 0, read_size, pos);
									//res.end(Buffer.from( buff.slice(0, red)));
									res.end(new Uint8Array(buff.buffer, 0, read_size));
								}
								else {

									while (read_size > 0) {
										read_size -= buff_size;
										if (read_size > 0) {
											red = server.fs.readSync(fh, buff, 0, buff_size, pos);
											res.write(buff);
											if (bi > buffers.length - 2) {
												buffers[bi] = new Uint8Array(buff_size);
											}
											buff = buffers[bi++];
										}
										else {
											//red = server.fs.readSync(fh, buff, 0, buff_size + read_size, pos);
											res.end(new Uint8Array(buff.buffer, 0, red));

											res.end(buff.slice(0, red));
											// console.log(bi, buffers.length,"read_size", read_size, buff_size, red, pos);
										}



										pos += buff_size;
									}
									//res.end();
									server.complete();
								}

							});

							return function (req, res) {
								req.on('end', function () {
									try {
										const filename = decodeURIComponent(req.search);
										chunk_size[0] = req.body_buffer.length;
										//  console.log("chunk_size[0]", chunk_size[0]);
										server.fs.appendFileSync(filename, Buffer.concat([chunk_size_u8, req.body_buffer]));
										res.end("completed");
									} catch (err) {
										console.error(err);
									}
								});
							}
						})());

					}, furl || "/func");

				};



				httprequest.cmdline = function (c) {
					return httprequest.get_url('/cmdline?' + encodeURIComponent(c));
				};


			}
			else {
				const http = require('http');
				const https = require('https');
				const fs = require('fs');
				const path = require('path');
				httprequest.get_url = function (url, type, post_data, content_type) {

					return new Promise(function (resolve) {
						url = url.trim();
						if (url.indexOf('http://') == 0) {
							if (post_data) {
								const req = http.request({
									method: "post",
									url: url

								});
								req.write(post_data);
								req.end();
							}
							else {
								http.get(url, function (res) {
									let data = [];
									res.on('data', function (chunk) {
										data.push(chunk);
									});

									res.on('end', function () {
										if (type == "text") {
											resolve(Buffer.concat(data).toString());
										}
										else {
											resolve(Buffer.concat(data));
										}
									});

								});
							}


						}
						else if (url.indexOf('https://') == 0) {
							if (post_data) {
								const req = https.request({
									method: "post",
									url: url

								});
								req.write(post_data);
								req.end();
							}
							else {
								https.get(url, function (res) {
									let data = [];
									res.on('data', function (chunk) {
										data.push(chunk);
									});
									res.on('end', function () {
										if (type == "text") {
											resolve(Buffer.concat(data).toString());
										}
										else {
											resolve(Buffer.concat(data).buffer);
										}

									});
								});
							}

						}
						else {
							if (url.indexOf(root_url) < 0) url = path.join(root_url, url);
							if (fs.existsSync(url)) {
								resolve(fs.readFileSync(url, { encoding: type === undefined ? "utf8" : type }));
							}
							else {
								console.log("url not found", url);
								resolve("Error not found", url)
							}
						}
					});
				};
			}

			return httprequest;

		});
	});

	packing.register("queue", function () {
		packing("define")("queue", function (define) {
			const queue = define(function (proto) {

				proto.size = function () {
					return this._newestIndex - this._oldestIndex;
				};
				proto.enqueue = function (data) {
					this._storage[this._newestIndex++] = data;
					return data;
				};

				proto.realign = function () {
					let count = this.size();
					let i = 0;
					for (i = 0; i < count; i++) {
						this._storage[i + 1] = this._storage[this._oldestIndex + i];
					}
					for (i = this._oldestIndex; i < this._newestIndex; i++) {
						this._storage[i] = undefined;
					}

					this._oldestIndex = 1;
					this._newestIndex = this._oldestIndex + count;
				};


				proto.dequeue = function () {
					if (this._oldestIndex !== this._newestIndex) {
						let deletedData = this._storage[this._oldestIndex];
						this._storage[this._oldestIndex++] = undefined;
						return deletedData;
					}
				};

				proto.fast_dequeue = function () {
					return this._storage[this._oldestIndex++];
				};

				proto.peek = function () {
					return this._storage[this._oldestIndex];
				};

				return function queue() {
					this._oldestIndex = 1;
					this._newestIndex = 1;
					this._storage = {};
				}

			});

			return queue;

		});
	});

	packing.register("stack", function () {
		packing("define")("stack", function (define) {
			const stack = define(function (proto) {




				proto.push = function (item) {
					this.data[this.index++] = item;
				};

				proto.pop = function () {
					if (this.index > 0) {
						const item = this.data[--this.index];
						this.data[this.index] = undefined;
						return item;

					}
					return undefined;
				};
				proto.peek = function () {
					return this.data[this.index - 1];
				}
				proto.reset = function () {
					this.index = 0;
				}
				function stack() {
					this.data = [];
					this.index = 0;

				}

				let prop_stack;
				stack.push_prop = function (obj, prop, value) {
					prop_stack = obj[prop + "_stack"];


					if (prop_stack === undefined) {
						prop_stack = new stack();
						obj[prop + "_stack"] = prop_stack;
					}
					prop_stack.push(obj[prop]);
					prop_stack = undefined;
					obj[prop] = value;
					return value;
				};

				stack.pop_prop = function (obj, prop) {
					prop_stack = obj[prop + "_stack"];
					if (prop_stack !== undefined) {
						obj[prop] = prop_stack.pop();
					}
					prop_stack = undefined;
					return obj[prop];


				};

				return stack;


			});
			return stack;

		});
	});

	packing.register("ds_array", function () {
		packing("define")("ds_array", function (define) {
			const ds_array = define(function (proto) {

				proto.push = function (element) {
					this.data[this.length++] = element;
					return this;
				};
				proto.push2 = function (e1, e2) {
					this.data[this.length++] = e1;
					this.data[this.length++] = e2;
					return this;
				};

				proto.push3 = function (e1, e2, e3) {
					this.data[this.length++] = e1;
					this.data[this.length++] = e2;
					this.data[this.length++] = e3;
					return this;
				};

				proto.push4 = function (e1, e2, e3, e4) {
					this.data[this.length++] = e1;
					this.data[this.length++] = e2;
					this.data[this.length++] = e3;
					this.data[this.length++] = e4;
					return this;
				};

				proto.push5 = function (e1, e2, e3, e4, e5) {

					this.data[this.length++] = e1;
					this.data[this.length++] = e2;
					this.data[this.length++] = e3;
					this.data[this.length++] = e4;
					this.data[this.length++] = e5;
					return this;
				};

				let i = 0;
				proto.push_args = function () {
					for (i = 0; i < arguments.length; i++)
						this.data[this.length++] = arguments[i];
				}

				proto.append_other = function (other) {
					for (i = 0; i < other.length; i++) {
						this.data[this.length++] = other.data[i];
					}
				}
				proto.peek = function () {
					return this.data[this.length - 1];
				};

				proto.pop = function () {
					if (this.length === 0) return null;
					return this.data[--this.length];
				};

				proto.clear = function () {
					this.length = 0;
				};

				proto.for_each = function (cb, self) {
					this.index = 0;
					while (this.index < this.length) {
						cb(this.data[this.index], this.index++, self);
					}
					this.index = 0;
				};

				proto.next = function () {
					if (this.index < this.length) {
						return this.data[this.index++];
					}
					return null;

				};
				proto.float32Array = function () {
					let f = new Float32Array(this.length);
					for (i = 0; i < this.length; i++)
						f[i] = this.data[i];

					return f;
				}
				return function ds_array(data) {
					this.data = data || [];
					this.length = 0;
					this.index = 0;
				}

			});
			return ds_array;

		});
	});

	packing.register("object_pooler", function () {
		packing("define")("object_pooler", function (define) {
			const object_pooler = define(function (proto) {



				proto.get = function (params) {
					if (this.freed > 0) {
						if (this.reuse)
							return this.reuse(this.free_objects[--this.freed], params);
						else
							return this.free_objects[--this.freed];
					}
					else {
						if (this.allocated >= this.pool_size) return null
						this.allocated++;
						return this.creator(params);
					}

				};
				proto.free = function (obj) {
					this.free_objects[this.freed++] = obj;
				};
				function object_pooler(creator, reuse, pool_size) {
					this.creator = creator;
					this.reuse = reuse;
					this.allocated = 0;
					this.freed = 0;
					this.pool_size = pool_size || Infinity;
					this.free_objects = [];
				};


				object_pooler.pools = function (creator) {
					let pools = {};
					function create_pool(key) {
						let pool = new object_pooler(creator);
						pools[key] = pool;
						return pool;
					}
					return function (key) {
						return pools[key] || create_pool(key);
					}
				};

				return object_pooler;
			});

			return object_pooler;

		});
	});



	packing.register("httprequest.data_keeper", function () {
		packing("events", "httprequest", "object_pooler", "queue", "object_pooler")("httprequest.data_keeper", function (httprequest, events, define, object_pooler, queue) {



			httprequest.bulk_url_loader = define(function (proto) {
				const items_pool = new object_pooler(function () {
					return [];
				});

				let item;

				proto.load = function (url, type, post_data, content_type) {
					const xtp = this.pool.get();

					if (xtp === null) {
						item = items_pool.get();
						item[0] = url;
						item[1] = type;
						item[2] = post_data;
						item[3] = content_type;

						this.park.enqueue(item);
						return;
					}
					xtp.manager = this;
					xtp.responseType = type || "arraybuffer";
					xtp.isBusy = true;
					xtp.url = url;

					if (post_data) {
						xtp.open("POST", url, !0);
						if (content_type)
							xtp.setRequestHeader('Content-Type', content_type);
						else {
							xtp.setRequestHeader('Content-Type', 'application/octet-stream');
						}
						xtp.send(post_data);
					}
					else {
						xtp.open("GET", url, !0);
						xtp.send();
					}


				};

				proto.check_park = function () {
					if (this.park.size() > 0) {
						item = this.park.dequeue();
						items_pool.free(item);
						this.load.apply(this, item);
						item[2] = undefined;
					}
				};

				proto.free = function (xtp) {
					this.pool.free(xtp);
					xtp.url = undefined;
					xtp.manager = undefined;
					this.check_park();
				};
				proto.onload = function () {

				}
				return function (pool_size) {
					this.park = new queue();
					this.pool = new object_pooler(function () {
						if (this.allocated <= this.max_size) {
							var xtp = new XMLHttpRequest();

							xtp.onload = function () {
								if (!this.manager) return;
								this.manager.onload(this.response, this.url);
								this.abort();
								this.isBusy = false;
								if (this.manager && this.manager.auto_free) this.manager.free(this);
							};

							return xtp
						}
						this.allocated--;
						return null;
					});

					this.pool.max_size = pool_size;
					this.auto_free = true;
					return this;


				}




			});

			const data_keeper = define(function (proto) {
				proto.get_data = function (url) {
					if (this.data_loading[url]) {
						if (this.data_loading[url].loaded) {
							this.data_loading[url].last_time = Date.now();
							return this.data_loading[url];
						}
					}
					else {
						this.data_loading[url] = this.data_pool.get(url);
						this.data_loading[url].last_time = Date.now();
						return undefined;
					}
				}

				let url, deleted = [], di;
				proto.clean_up = function () {
					di = 0;
					for (url in this.data_loading) {
						if (this.data_loading[url].loaded) {
							if (Date.now() - this.data_loading[url].last_time > this.clean_up_time) {
								deleted[di++] = url;
							}
						}
					}

					if (di > 0) {
						while (di > 0) {
							url = deleted[--di];
							this.data_loading[url].loaded = false;
							this.data_pool.free(this.data_loading[url]);
							delete this.data_loading[url];
						}
						//console.log(Object.keys(this.data_loading).length, "data keeper free");
					}
				};
				proto.on_data_loaded = function (data) { }



				return function data_keeper(create_data, reuse_data, clean_up_time) {
					this.data_loading = {};
					this.clean_up_time = clean_up_time || 3000;
					this.data_pool = new object_pooler(create_data || function (url) { }, reuse_data);
					this.on_loading = new events.event(this, [null]);
				};
			});


			data_keeper.datas = (function () {

				return function (nums) {
					let dta;
					const data_loader = new httprequest.bulk_url_loader(nums || 8);
					const data_keeper = new httprequest.data_keeper(
						function (url) { data_loader.load(url); return {}; },
						function (dta, url) { data_loader.load(url); dta.loaded = false; return dta; }
					);
					data_loader.onload = function (data, url) {
						dta = data_keeper.data_loading[url];
						if (dta) {
							dta.data = data;
							dta.loaded = true;
							dta.url = url;
							dta.last_time = 0;
							data_keeper.on_loading.params[0] = dta;
							data_keeper.on_loading.trigger_params();
						}
					};
					return data_keeper;
				}

			})();

			data_keeper.images = (function () {

				return function () {
					const images_loader = new httprequest.data_keeper(
						function (url) {
							const img = new Image();
							img.crossOrigin = "Anonymous";
							img.onload = function () {
								img.loaded = true;
								images_loader.on_loading.params[0] = img;
								images_loader.on_loading.trigger_params();
							};
							img.src = url;
							return img;
						},
						function (img, url) {
							img.loaded = false;
							img.src = url;
							return img;
						}
					);
					return images_loader;
				}

			})();

			httprequest.data_keeper = data_keeper;


		});
	});

	packing.register("define", function () {

		packing()("define", function () {

			const is_function = function (obj) {
				return !!(obj && obj.constructor && obj.call && obj.apply);
			};
			const define = function (_creator, _super) {
				_super = _super || Object;
				let proto = {};
				Object.assign(proto, _super.prototype);
				proto.override = function (orig) {
					return function (defi) {
						proto[orig.fname] = defi(orig);
					}
				};
				let _class = _creator(proto, _super);
				_class.class_name = _creator.name;
				_class.super_class = _super;
				let k;
				for (k in proto) {
					if (is_function(proto[k])) {
						proto[k].fname = k;
					}
				}

				for (k in _super) {
					if (is_function(_super[k])) {
						if (_class[k] === undefined) _class[k] = _super[k];
					}
				}
				_class.prototype = Object.create(_super.prototype);
				Object.assign(_class.prototype, proto);
				return (_class);
			};

			define.is_function = is_function;

			define.is_string = function (x) {
				return Object.prototype.toString.call(x) === "[object String]"
			};

			define.is_object = function (x) {
				return Object.prototype.toString.call(x).toLocaleLowerCase() === '[object object]'
			};

			

			//@cmdline is_object is_string is_function
			return define;



		});
	});


	packing.register("webgl2_context", function () {

		packing()("webgl2_context", function () {

			constants$({
				KBD_KEY_CANCEL: 3,
				KBD_KEY_HELP: 6,
				KBD_KEY_BACK_SPACE: 8,
				KBD_KEY_TAB: 9,
				KBD_KEY_CLEAR: 12,
				KBD_KEY_RETURN: 13,
				KBD_KEY_ENTER: 14,
				KBD_KEY_SHIFT: 16,
				KBD_KEY_CONTROL: 17,
				KBD_KEY_ALT: 18,
				KBD_KEY_PAUSE: 19,
				KBD_KEY_CAPS_LOCK: 20,
				KBD_KEY_ESCAPE: 27,
				KBD_KEY_SPACE: 32,
				KBD_KEY_PAGE_UP: 33,
				KBD_KEY_PAGE_DOWN: 34,
				KBD_KEY_END: 35,
				KBD_KEY_HOME: 36,
				KBD_KEY_LEFT: 37,
				KBD_KEY_UP: 38,
				KBD_KEY_RIGHT: 39,
				KBD_KEY_DOWN: 40,
				KBD_KEY_PRINTSCREEN: 44,
				KBD_KEY_INSERT: 45,
				KBD_KEY_DELETE: 46,
				KBD_KEY_0: 48,
				KBD_KEY_1: 49,
				KBD_KEY_2: 50,
				KBD_KEY_3: 51,
				KBD_KEY_4: 52,
				KBD_KEY_5: 53,
				KBD_KEY_6: 54,
				KBD_KEY_7: 55,
				KBD_KEY_8: 56,
				KBD_KEY_9: 57,
				KBD_KEY_SEMICOLON: 59,
				KBD_KEY_EQUALS: 61,
				KBD_KEY_A: 65,
				KBD_KEY_B: 66,
				KBD_KEY_C: 67,
				KBD_KEY_D: 68,
				KBD_KEY_E: 69,
				KBD_KEY_F: 70,
				KBD_KEY_G: 71,
				KBD_KEY_H: 72,
				KBD_KEY_I: 73,
				KBD_KEY_J: 74,
				KBD_KEY_K: 75,
				KBD_KEY_L: 76,
				KBD_KEY_M: 77,
				KBD_KEY_N: 78,
				KBD_KEY_O: 79,
				KBD_KEY_P: 80,
				KBD_KEY_Q: 81,
				KBD_KEY_R: 82,
				KBD_KEY_S: 83,
				KBD_KEY_T: 84,
				KBD_KEY_U: 85,
				KBD_KEY_V: 86,
				KBD_KEY_W: 87,
				KBD_KEY_X: 88,
				KBD_KEY_Y: 89,
				KBD_KEY_Z: 90,
				KBD_KEY_CONTEXT_MENU: 93,
				KBD_KEY_NUMPAD0: 96,
				KBD_KEY_NUMPAD1: 97,
				KBD_KEY_NUMPAD2: 98,
				KBD_KEY_NUMPAD3: 99,
				KBD_KEY_NUMPAD4: 100,
				KBD_KEY_NUMPAD5: 101,
				KBD_KEY_NUMPAD6: 102,
				KBD_KEY_NUMPAD7: 103,
				KBD_KEY_NUMPAD8: 104,
				KBD_KEY_NUMPAD9: 105,
				KBD_KEY_MULTIPLY: 106,
				KBD_KEY_DDD: 107,
				KBD_KEY_SEPARATOR: 108,
				KBD_KEY_SUBTRACT: 109,
				KBD_KEY_DECIMAL: 110,
				KBD_KEY_DIVIDE: 111,
				KBD_KEY_F1: 112,
				KBD_KEY_F2: 113,
				KBD_KEY_F3: 114,
				KBD_KEY_F4: 115,
				KBD_KEY_F5: 116,
				KBD_KEY_F6: 117,
				KBD_KEY_F7: 118,
				KBD_KEY_F8: 119,
				KBD_KEY_F9: 120,
				KBD_KEY_F10: 121,
				KBD_KEY_F11: 122,
				KBD_KEY_F12: 123,
				KBD_KEY_F13: 124,
				KBD_KEY_F14: 125,
				KBD_KEY_F15: 126,
				KBD_KEY_F16: 127,
				KBD_KEY_F17: 128,
				KBD_KEY_F18: 129,
				KBD_KEY_F19: 130,
				KBD_KEY_F20: 131,
				KBD_KEY_F21: 132,
				KBD_KEY_F22: 133,
				KBD_KEY_F23: 134,
				KBD_KEY_F24: 135,
				KBD_KEY_NUM_LOCK: 144,
				KBD_KEY_SCROLL_LOCK: 145,
				KBD_KEY_COMMA: 188,
				KBD_KEY_PERIOD: 190,
				KBD_KEY_SLASH: 191,
				KBD_KEY_BACK_QUOTE: 192,
				KBD_KEY_OPEN_BRACKET: 219,
				KBD_KEY_BACK_SLASH: 220,
				KBD_KEY_CLOSE_BRACKET: 221,
				KBD_KEY_QUOTE: 222,
				KBD_KEY_META: 224

			});

			constants$({
				GL_ACTIVE_ATTRIBUTES: 35721,
				GL_ACTIVE_TEXTURE: 34016,
				GL_ACTIVE_UNIFORMS: 35718,
				GL_ALIASED_LINE_WIDTH_RANGE: 33902,
				GL_ALIASED_POINT_SIZE_RANGE: 33901,
				GL_ALPHA: 6406,
				GL_ALPHA_BITS: 3413,
				GL_ALWAYS: 519,
				GL_ARRAY_BUFFER: 34962,
				GL_ARRAY_BUFFER_BINDING: 34964,
				GL_ATTACHED_SHADERS: 35717,
				GL_BACK: 1029,
				GL_BLEND: 3042,
				GL_BLEND_COLOR: 32773,
				GL_BLEND_DST_ALPHA: 32970,
				GL_BLEND_DST_RGB: 32968,
				GL_BLEND_EQUATION: 32777,
				GL_BLEND_EQUATION_ALPHA: 34877,
				GL_BLEND_EQUATION_RGB: 32777,
				GL_BLEND_SRC_ALPHA: 32971,
				GL_BLEND_SRC_RGB: 32969,
				GL_BLUE_BITS: 3412,
				GL_BOOL: 35670,
				GL_BOOL_VEC2: 35671,
				GL_BOOL_VEC3: 35672,
				GL_BOOL_VEC4: 35673,
				GL_BROWSER_DEFAULT_WEBGL: 37444,
				GL_BUFFER_SIZE: 34660,
				GL_BUFFER_USAGE: 34661,
				GL_BYTE: 5120,
				GL_CCW: 2305,
				GL_CLAMP_TO_EDGE: 33071,
				GL_COLOR_ATTACHMENT0: 36064,
				GL_COLOR_BUFFER_BIT: 16384,
				GL_COLOR_CLEAR_VALUE: 3106,
				GL_COLOR_WRITEMASK: 3107,
				GL_COMPILE_STATUS: 35713,
				GL_COMPRESSED_TEXTURE_FORMATS: 34467,
				GL_CONSTANT_ALPHA: 32771,
				GL_CONSTANT_COLOR: 32769,
				GL_CONTEXT_LOST_WEBGL: 37442,
				GL_CULL_FACE: 2884,
				GL_CULL_FACE_MODE: 2885,
				GL_CURRENT_PROGRAM: 35725,
				GL_CURRENT_VERTEX_ATTRIB: 34342,
				GL_CW: 2304,
				GL_DECR: 7683,
				GL_DECR_WRAP: 34056,
				GL_DELETE_STATUS: 35712,
				GL_DEPTH_ATTACHMENT: 36096,
				GL_DEPTH_BITS: 3414,
				GL_DEPTH_BUFFER_BIT: 256,
				GL_DEPTH_CLEAR_VALUE: 2931,
				GL_DEPTH_COMPONENT: 6402,
				GL_DEPTH_COMPONENT16: 33189,
				GL_DEPTH_FUNC: 2932,
				GL_DEPTH_RANGE: 2928,
				GL_DEPTH_STENCIL: 34041,
				GL_DEPTH_STENCIL_ATTACHMENT: 33306,
				GL_DEPTH_TEST: 2929,
				GL_DEPTH_WRITEMASK: 2930,
				GL_DITHER: 3024,
				GL_DONT_CARE: 4352,
				GL_DST_ALPHA: 772,
				GL_DST_COLOR: 774,
				GL_DYNAMIC_DRAW: 35048,
				GL_ELEMENT_ARRAY_BUFFER: 34963,
				GL_ELEMENT_ARRAY_BUFFER_BINDING: 34965,
				GL_EQUAL: 514,
				GL_FASTEST: 4353,
				GL_FLOAT: 5126,
				GL_FLOAT_MAT2: 35674,
				GL_FLOAT_MAT3: 35675,
				GL_FLOAT_MAT4: 35676,
				GL_FLOAT_VEC2: 35664,
				GL_FLOAT_VEC3: 35665,
				GL_FLOAT_VEC4: 35666,
				GL_FRAGMENT_SHADER: 35632,
				GL_FRAMEBUFFER: 36160,
				GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
				GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
				GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
				GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
				GL_FRAMEBUFFER_BINDING: 36006,
				GL_FRAMEBUFFER_COMPLETE: 36053,
				GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
				GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
				GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
				GL_FRAMEBUFFER_UNSUPPORTED: 36061,
				GL_FRONT: 1028,
				GL_FRONT_AND_BACK: 1032,
				GL_FRONT_FACE: 2886,
				GL_FUNC_ADD: 32774,
				GL_FUNC_REVERSE_SUBTRACT: 32779,
				GL_FUNC_SUBTRACT: 32778,
				GL_GENERATE_MIPMAP_HINT: 33170,
				GL_GEQUAL: 518,
				GL_GREATER: 516,
				GL_GREEN_BITS: 3411,
				GL_HIGH_FLOAT: 36338,
				GL_HIGH_INT: 36341,
				GL_IMPLEMENTATION_COLOR_READ_FORMAT: 35739,
				GL_IMPLEMENTATION_COLOR_READ_TYPE: 35738,
				GL_INCR: 7682,
				GL_INCR_WRAP: 34055,
				GL_INT: 5124,
				GL_INT_VEC2: 35667,
				GL_INT_VEC3: 35668,
				GL_INT_VEC4: 35669,
				GL_INVALID_ENUM: 1280,
				GL_INVALID_FRAMEBUFFER_OPERATION: 1286,
				GL_INVALID_OPERATION: 1282,
				GL_INVALID_VALUE: 1281,
				GL_INVERT: 5386,
				GL_KEEP: 7680,
				GL_LEQUAL: 515,
				GL_LESS: 513,
				GL_LINEAR: 9729,
				GL_LINEAR_MIPMAP_LINEAR: 9987,
				GL_LINEAR_MIPMAP_NEAREST: 9985,
				GL_LINES: 1,
				GL_LINE_LOOP: 2,
				GL_LINE_STRIP: 3,
				GL_LINE_WIDTH: 2849,
				GL_LINK_STATUS: 35714,
				GL_LOW_FLOAT: 36336,
				GL_LOW_INT: 36339,
				GL_LUMINANCE: 6409,
				GL_LUMINANCE_ALPHA: 6410,
				GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
				GL_MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
				GL_MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
				GL_MAX_RENDERBUFFER_SIZE: 34024,
				GL_MAX_TEXTURE_IMAGE_UNITS: 34930,
				GL_MAX_TEXTURE_SIZE: 3379,
				GL_MAX_VARYING_VECTORS: 36348,
				GL_MAX_VERTEX_ATTRIBS: 34921,
				GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
				GL_MAX_VERTEX_UNIFORM_VECTORS: 36347,
				GL_MAX_VIEWPORT_DIMS: 3386,
				GL_MEDIUM_FLOAT: 36337,
				GL_MEDIUM_INT: 36340,
				GL_MIRRORED_REPEAT: 33648,
				GL_NEAREST: 9728,
				GL_NEAREST_MIPMAP_LINEAR: 9986,
				GL_NEAREST_MIPMAP_NEAREST: 9984,
				GL_NEVER: 512,
				GL_NICEST: 4354,
				GL_NONE: 0,
				GL_NOTEQUAL: 517,
				GL_NO_ERROR: 0,
				GL_ONE: 1,
				GL_ONE_MINUS_CONSTANT_ALPHA: 32772,
				GL_ONE_MINUS_CONSTANT_COLOR: 32770,
				GL_ONE_MINUS_DST_ALPHA: 773,
				GL_ONE_MINUS_DST_COLOR: 775,
				GL_ONE_MINUS_SRC_ALPHA: 771,
				GL_ONE_MINUS_SRC_COLOR: 769,
				GL_OUT_OF_MEMORY: 1285,
				GL_PACK_ALIGNMENT: 3333,
				GL_POINTS: 0,
				GL_POLYGON_OFFSET_FACTOR: 32824,
				GL_POLYGON_OFFSET_FILL: 32823,
				GL_POLYGON_OFFSET_UNITS: 10752,
				GL_RED_BITS: 3410,
				GL_RENDERBUFFER: 36161,
				GL_RENDERBUFFER_ALPHA_SIZE: 36179,
				GL_RENDERBUFFER_BINDING: 36007,
				GL_RENDERBUFFER_BLUE_SIZE: 36178,
				GL_RENDERBUFFER_DEPTH_SIZE: 36180,
				GL_RENDERBUFFER_GREEN_SIZE: 36177,
				GL_RENDERBUFFER_HEIGHT: 36163,
				GL_RENDERBUFFER_INTERNAL_FORMAT: 36164,
				GL_RENDERBUFFER_RED_SIZE: 36176,
				GL_RENDERBUFFER_STENCIL_SIZE: 36181,
				GL_RENDERBUFFER_WIDTH: 36162,
				GL_RENDERER: 7937,
				GL_REPEAT: 10497,
				GL_REPLACE: 7681,
				GL_RGB: 6407,
				GL_RGB5_A1: 32855,
				GL_RGB565: 36194,
				GL_RGBA: 6408,
				GL_RGBA4: 32854,
				GL_SAMPLER_2D: 35678,
				GL_SAMPLER_CUBE: 35680,
				GL_SAMPLES: 32937,
				GL_SAMPLE_ALPHA_TO_COVERAGE: 32926,
				GL_SAMPLE_BUFFERS: 32936,
				GL_SAMPLE_COVERAGE: 32928,
				GL_SAMPLE_COVERAGE_INVERT: 32939,
				GL_SAMPLE_COVERAGE_VALUE: 32938,
				GL_SCISSOR_BOX: 3088,
				GL_SCISSOR_TEST: 3089,
				GL_SHADER_TYPE: 35663,
				GL_SHADING_LANGUAGE_VERSION: 35724,
				GL_SHORT: 5122,
				GL_SRC_ALPHA: 770,
				GL_SRC_ALPHA_SATURATE: 776,
				GL_SRC_COLOR: 768,
				GL_STATIC_DRAW: 35044,
				GL_STENCIL_ATTACHMENT: 36128,
				GL_STENCIL_BACK_FAIL: 34817,
				GL_STENCIL_BACK_FUNC: 34816,
				GL_STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
				GL_STENCIL_BACK_PASS_DEPTH_PASS: 34819,
				GL_STENCIL_BACK_REF: 36003,
				GL_STENCIL_BACK_VALUE_MASK: 36004,
				GL_STENCIL_BACK_WRITEMASK: 36005,
				GL_STENCIL_BITS: 3415,
				GL_STENCIL_BUFFER_BIT: 1024,
				GL_STENCIL_CLEAR_VALUE: 2961,
				GL_STENCIL_FAIL: 2964,
				GL_STENCIL_FUNC: 2962,
				GL_STENCIL_INDEX8: 36168,
				GL_STENCIL_PASS_DEPTH_FAIL: 2965,
				GL_STENCIL_PASS_DEPTH_PASS: 2966,
				GL_STENCIL_REF: 2967,
				GL_STENCIL_TEST: 2960,
				GL_STENCIL_VALUE_MASK: 2963,
				GL_STENCIL_WRITEMASK: 2968,
				GL_STREAM_DRAW: 35040,
				GL_SUBPIXEL_BITS: 3408,
				GL_TEXTURE: 5890,
				GL_TEXTURE0: 33984,
				GL_TEXTURE1: 33985,
				GL_TEXTURE2: 33986,
				GL_TEXTURE3: 33987,
				GL_TEXTURE4: 33988,
				GL_TEXTURE5: 33989,
				GL_TEXTURE6: 33990,
				GL_TEXTURE7: 33991,
				GL_TEXTURE8: 33992,
				GL_TEXTURE9: 33993,
				GL_TEXTURE10: 33994,
				GL_TEXTURE11: 33995,
				GL_TEXTURE12: 33996,
				GL_TEXTURE13: 33997,
				GL_TEXTURE14: 33998,
				GL_TEXTURE15: 33999,
				GL_TEXTURE16: 34000,
				GL_TEXTURE17: 34001,
				GL_TEXTURE18: 34002,
				GL_TEXTURE19: 34003,
				GL_TEXTURE20: 34004,
				GL_TEXTURE21: 34005,
				GL_TEXTURE22: 34006,
				GL_TEXTURE23: 34007,
				GL_TEXTURE24: 34008,
				GL_TEXTURE25: 34009,
				GL_TEXTURE26: 34010,
				GL_TEXTURE27: 34011,
				GL_TEXTURE28: 34012,
				GL_TEXTURE29: 34013,
				GL_TEXTURE30: 34014,
				GL_TEXTURE31: 34015,
				GL_TEXTURE_2D: 3553,
				GL_TEXTURE_BINDING_2D: 32873,
				GL_TEXTURE_BINDING_CUBE_MAP: 34068,
				GL_TEXTURE_CUBE_MAP: 34067,
				GL_TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
				GL_TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
				GL_TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
				GL_TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
				GL_TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
				GL_TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
				GL_TEXTURE_MAG_FILTER: 10240,
				GL_TEXTURE_MIN_FILTER: 10241,
				GL_TEXTURE_WRAP_S: 10242,
				GL_TEXTURE_WRAP_T: 10243,
				GL_TRIANGLES: 4,
				GL_TRIANGLE_FAN: 6,
				GL_TRIANGLE_STRIP: 5,
				GL_UNPACK_ALIGNMENT: 3317,
				GL_UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
				GL_UNPACK_FLIP_Y_WEBGL: 37440,
				GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
				GL_UNSIGNED_BYTE: 5121,
				GL_UNSIGNED_INT: 5125,
				GL_UNSIGNED_SHORT: 5123,
				GL_UNSIGNED_SHORT_4_4_4_4: 32819,
				GL_UNSIGNED_SHORT_5_5_5_1: 32820,
				GL_UNSIGNED_SHORT_5_6_5: 33635,
				GL_VALIDATE_STATUS: 35715,
				GL_VENDOR: 7936,
				GL_VERSION: 7938,
				GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
				GL_VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
				GL_VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
				GL_VERTEX_ATTRIB_ARRAY_POINTER: 34373,
				GL_VERTEX_ATTRIB_ARRAY_SIZE: 34339,
				GL_VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
				GL_VERTEX_ATTRIB_ARRAY_TYPE: 34341,
				GL_VERTEX_SHADER: 35633,
				GL_VIEWPORT: 2978,
				GL_ZERO: 0
			})

			constants$({
				GL_DEPTH_BUFFER_BIT: 256,
				GL_STENCIL_BUFFER_BIT: 1024,
				GL_COLOR_BUFFER_BIT: 16384,
				GL_POINTS: 0,
				GL_LINES: 1,
				GL_LINE_LOOP: 2,
				GL_LINE_STRIP: 3,
				GL_TRIANGLES: 4,
				GL_TRIANGLE_STRIP: 5,
				GL_TRIANGLE_FAN: 6,
				GL_ZERO: 0,
				GL_ONE: 1,
				GL_SRC_COLOR: 768,
				GL_ONE_MINUS_SRC_COLOR: 769,
				GL_SRC_ALPHA: 770,
				GL_ONE_MINUS_SRC_ALPHA: 771,
				GL_DST_ALPHA: 772,
				GL_ONE_MINUS_DST_ALPHA: 773,
				GL_DST_COLOR: 774,
				GL_ONE_MINUS_DST_COLOR: 775,
				GL_SRC_ALPHA_SATURATE: 776,
				GL_FUNC_ADD: 32774,
				GL_BLEND_EQUATION: 32777,
				GL_BLEND_EQUATION_RGB: 32777,
				GL_BLEND_EQUATION_ALPHA: 34877,
				GL_FUNC_SUBTRACT: 32778,
				GL_FUNC_REVERSE_SUBTRACT: 32779,
				GL_BLEND_DST_RGB: 32968,
				GL_BLEND_SRC_RGB: 32969,
				GL_BLEND_DST_ALPHA: 32970,
				GL_BLEND_SRC_ALPHA: 32971,
				GL_CONSTANT_COLOR: 32769,
				GL_ONE_MINUS_CONSTANT_COLOR: 32770,
				GL_CONSTANT_ALPHA: 32771,
				GL_ONE_MINUS_CONSTANT_ALPHA: 32772,
				GL_BLEND_COLOR: 32773,
				GL_ARRAY_BUFFER: 34962,
				GL_ELEMENT_ARRAY_BUFFER: 34963,
				GL_ARRAY_BUFFER_BINDING: 34964,
				GL_ELEMENT_ARRAY_BUFFER_BINDING: 34965,
				GL_STREAM_DRAW: 35040,
				GL_STATIC_DRAW: 35044,
				GL_DYNAMIC_DRAW: 35048,
				GL_BUFFER_SIZE: 34660,
				GL_BUFFER_USAGE: 34661,
				GL_CURRENT_VERTEX_ATTRIB: 34342,
				GL_FRONT: 1028,
				GL_BACK: 1029,
				GL_FRONT_AND_BACK: 1032,
				GL_TEXTURE_2D: 3553,
				GL_CULL_FACE: 2884,
				GL_BLEND: 3042,
				GL_DITHER: 3024,
				GL_STENCIL_TEST: 2960,
				GL_DEPTH_TEST: 2929,
				GL_SCISSOR_TEST: 3089,
				GL_POLYGON_OFFSET_FILL: 32823,
				GL_SAMPLE_ALPHA_TO_COVERAGE: 32926,
				GL_SAMPLE_COVERAGE: 32928,
				GL_NO_ERROR: 0,
				GL_INVALID_ENUM: 1280,
				GL_INVALID_VALUE: 1281,
				GL_INVALID_OPERATION: 1282,
				GL_OUT_OF_MEMORY: 1285,
				GL_CW: 2304,
				GL_CCW: 2305,
				GL_LINE_WIDTH: 2849,
				GL_ALIASED_POINT_SIZE_RANGE: 33901,
				GL_ALIASED_LINE_WIDTH_RANGE: 33902,
				GL_CULL_FACE_MODE: 2885,
				GL_FRONT_FACE: 2886,
				GL_DEPTH_RANGE: 2928,
				GL_DEPTH_WRITEMASK: 2930,
				GL_DEPTH_CLEAR_VALUE: 2931,
				GL_DEPTH_FUNC: 2932,
				GL_STENCIL_CLEAR_VALUE: 2961,
				GL_STENCIL_FUNC: 2962,
				GL_STENCIL_FAIL: 2964,
				GL_STENCIL_PASS_DEPTH_FAIL: 2965,
				GL_STENCIL_PASS_DEPTH_PASS: 2966,
				GL_STENCIL_REF: 2967,
				GL_STENCIL_VALUE_MASK: 2963,
				GL_STENCIL_WRITEMASK: 2968,
				GL_STENCIL_BACK_FUNC: 34816,
				GL_STENCIL_BACK_FAIL: 34817,
				GL_STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
				GL_STENCIL_BACK_PASS_DEPTH_PASS: 34819,
				GL_STENCIL_BACK_REF: 36003,
				GL_STENCIL_BACK_VALUE_MASK: 36004,
				GL_STENCIL_BACK_WRITEMASK: 36005,
				GL_VIEWPORT: 2978,
				GL_SCISSOR_BOX: 3088,
				GL_COLOR_CLEAR_VALUE: 3106,
				GL_COLOR_WRITEMASK: 3107,
				GL_UNPACK_ALIGNMENT: 3317,
				GL_PACK_ALIGNMENT: 3333,
				GL_MAX_TEXTURE_SIZE: 3379,
				GL_MAX_VIEWPORT_DIMS: 3386,
				GL_SUBPIXEL_BITS: 3408,
				GL_RED_BITS: 3410,
				GL_GREEN_BITS: 3411,
				GL_BLUE_BITS: 3412,
				GL_ALPHA_BITS: 3413,
				GL_DEPTH_BITS: 3414,
				GL_STENCIL_BITS: 3415,
				GL_POLYGON_OFFSET_UNITS: 10752,
				GL_POLYGON_OFFSET_FACTOR: 32824,
				GL_TEXTURE_BINDING_2D: 32873,
				GL_SAMPLE_BUFFERS: 32936,
				GL_SAMPLES: 32937,
				GL_SAMPLE_COVERAGE_VALUE: 32938,
				GL_SAMPLE_COVERAGE_INVERT: 32939,
				GL_COMPRESSED_TEXTURE_FORMATS: 34467,
				GL_DONT_CARE: 4352,
				GL_FASTEST: 4353,
				GL_NICEST: 4354,
				GL_GENERATE_MIPMAP_HINT: 33170,
				GL_BYTE: 5120,
				GL_UNSIGNED_BYTE: 5121,
				GL_SHORT: 5122,
				GL_UNSIGNED_SHORT: 5123,
				GL_INT: 5124,
				GL_UNSIGNED_INT: 5125,
				GL_FLOAT: 5126,
				GL_DEPTH_COMPONENT: 6402,
				GL_ALPHA: 6406,
				GL_RGB: 6407,
				GL_RGBA: 6408,
				GL_LUMINANCE: 6409,
				GL_LUMINANCE_ALPHA: 6410,
				GL_UNSIGNED_SHORT_4_4_4_4: 32819,
				GL_UNSIGNED_SHORT_5_5_5_1: 32820,
				GL_UNSIGNED_SHORT_5_6_5: 33635,
				GL_FRAGMENT_SHADER: 35632,
				GL_VERTEX_SHADER: 35633,
				GL_MAX_VERTEX_ATTRIBS: 34921,
				GL_MAX_VERTEX_UNIFORM_VECTORS: 36347,
				GL_MAX_VARYING_VECTORS: 36348,
				GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
				GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
				GL_MAX_TEXTURE_IMAGE_UNITS: 34930,
				GL_MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
				GL_SHADER_TYPE: 35663,
				GL_DELETE_STATUS: 35712,
				GL_LINK_STATUS: 35714,
				GL_VALIDATE_STATUS: 35715,
				GL_ATTACHED_SHADERS: 35717,
				GL_ACTIVE_UNIFORMS: 35718,
				GL_ACTIVE_ATTRIBUTES: 35721,
				GL_SHADING_LANGUAGE_VERSION: 35724,
				GL_CURRENT_PROGRAM: 35725,
				GL_NEVER: 512,
				GL_LESS: 513,
				GL_EQUAL: 514,
				GL_LEQUAL: 515,
				GL_GREATER: 516,
				GL_NOTEQUAL: 517,
				GL_GEQUAL: 518,
				GL_ALWAYS: 519,
				GL_KEEP: 7680,
				GL_REPLACE: 7681,
				GL_INCR: 7682,
				GL_DECR: 7683,
				GL_INVERT: 5386,
				GL_INCR_WRAP: 34055,
				GL_DECR_WRAP: 34056,
				GL_VENDOR: 7936,
				GL_RENDERER: 7937,
				GL_VERSION: 7938,
				GL_NEAREST: 9728,
				GL_LINEAR: 9729,
				GL_NEAREST_MIPMAP_NEAREST: 9984,
				GL_LINEAR_MIPMAP_NEAREST: 9985,
				GL_NEAREST_MIPMAP_LINEAR: 9986,
				GL_LINEAR_MIPMAP_LINEAR: 9987,
				GL_TEXTURE_MAG_FILTER: 10240,
				GL_TEXTURE_MIN_FILTER: 10241,
				GL_TEXTURE_WRAP_S: 10242,
				GL_TEXTURE_WRAP_T: 10243,
				GL_TEXTURE: 5890,
				GL_TEXTURE_CUBE_MAP: 34067,
				GL_TEXTURE_BINDING_CUBE_MAP: 34068,
				GL_TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
				GL_TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
				GL_TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
				GL_TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
				GL_TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
				GL_TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
				GL_MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
				GL_TEXTURE0: 33984,
				GL_TEXTURE1: 33985,
				GL_TEXTURE2: 33986,
				GL_TEXTURE3: 33987,
				GL_TEXTURE4: 33988,
				GL_TEXTURE5: 33989,
				GL_TEXTURE6: 33990,
				GL_TEXTURE7: 33991,
				GL_TEXTURE8: 33992,
				GL_TEXTURE9: 33993,
				GL_TEXTURE10: 33994,
				GL_TEXTURE11: 33995,
				GL_TEXTURE12: 33996,
				GL_TEXTURE13: 33997,
				GL_TEXTURE14: 33998,
				GL_TEXTURE15: 33999,
				GL_TEXTURE16: 34000,
				GL_TEXTURE17: 34001,
				GL_TEXTURE18: 34002,
				GL_TEXTURE19: 34003,
				GL_TEXTURE20: 34004,
				GL_TEXTURE21: 34005,
				GL_TEXTURE22: 34006,
				GL_TEXTURE23: 34007,
				GL_TEXTURE24: 34008,
				GL_TEXTURE25: 34009,
				GL_TEXTURE26: 34010,
				GL_TEXTURE27: 34011,
				GL_TEXTURE28: 34012,
				GL_TEXTURE29: 34013,
				GL_TEXTURE30: 34014,
				GL_TEXTURE31: 34015,
				GL_ACTIVE_TEXTURE: 34016,
				GL_REPEAT: 10497,
				GL_CLAMP_TO_EDGE: 33071,
				GL_MIRRORED_REPEAT: 33648,
				GL_FLOAT_VEC2: 35664,
				GL_FLOAT_VEC3: 35665,
				GL_FLOAT_VEC4: 35666,
				GL_INT_VEC2: 35667,
				GL_INT_VEC3: 35668,
				GL_INT_VEC4: 35669,
				GL_BOOL: 35670,
				GL_BOOL_VEC2: 35671,
				GL_BOOL_VEC3: 35672,
				GL_BOOL_VEC4: 35673,
				GL_FLOAT_MAT2: 35674,
				GL_FLOAT_MAT3: 35675,
				GL_FLOAT_MAT4: 35676,
				GL_SAMPLER_2D: 35678,
				GL_SAMPLER_CUBE: 35680,
				GL_VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
				GL_VERTEX_ATTRIB_ARRAY_SIZE: 34339,
				GL_VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
				GL_VERTEX_ATTRIB_ARRAY_TYPE: 34341,
				GL_VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
				GL_VERTEX_ATTRIB_ARRAY_POINTER: 34373,
				GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
				GL_IMPLEMENTATION_COLOR_READ_TYPE: 35738,
				GL_IMPLEMENTATION_COLOR_READ_FORMAT: 35739,
				GL_COMPILE_STATUS: 35713,
				GL_LOW_FLOAT: 36336,
				GL_MEDIUM_FLOAT: 36337,
				GL_HIGH_FLOAT: 36338,
				GL_LOW_INT: 36339,
				GL_MEDIUM_INT: 36340,
				GL_HIGH_INT: 36341,
				GL_FRAMEBUFFER: 36160,
				GL_RENDERBUFFER: 36161,
				GL_RGBA4: 32854,
				GL_RGB5_A1: 32855,
				GL_RGB565: 36194,
				GL_DEPTH_COMPONENT16: 33189,
				GL_STENCIL_INDEX8: 36168,
				GL_DEPTH_STENCIL: 34041,
				GL_RENDERBUFFER_WIDTH: 36162,
				GL_RENDERBUFFER_HEIGHT: 36163,
				GL_RENDERBUFFER_INTERNAL_FORMAT: 36164,
				GL_RENDERBUFFER_RED_SIZE: 36176,
				GL_RENDERBUFFER_GREEN_SIZE: 36177,
				GL_RENDERBUFFER_BLUE_SIZE: 36178,
				GL_RENDERBUFFER_ALPHA_SIZE: 36179,
				GL_RENDERBUFFER_DEPTH_SIZE: 36180,
				GL_RENDERBUFFER_STENCIL_SIZE: 36181,
				GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
				GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
				GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
				GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
				GL_COLOR_ATTACHMENT0: 36064,
				GL_DEPTH_ATTACHMENT: 36096,
				GL_STENCIL_ATTACHMENT: 36128,
				GL_DEPTH_STENCIL_ATTACHMENT: 33306,
				GL_NONE: 0,
				GL_FRAMEBUFFER_COMPLETE: 36053,
				GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
				GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
				GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
				GL_FRAMEBUFFER_UNSUPPORTED: 36061,
				GL_FRAMEBUFFER_BINDING: 36006,
				GL_RENDERBUFFER_BINDING: 36007,
				GL_MAX_RENDERBUFFER_SIZE: 34024,
				GL_INVALID_FRAMEBUFFER_OPERATION: 1286,
				GL_UNPACK_FLIP_Y_WEBGL: 37440,
				GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
				GL_CONTEXT_LOST_WEBGL: 37442,
				GL_UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
				GL_BROWSER_DEFAULT_WEBGL: 37444,
				GL_READ_BUFFER: 3074,
				GL_UNPACK_ROW_LENGTH: 3314,
				GL_UNPACK_SKIP_ROWS: 3315,
				GL_UNPACK_SKIP_PIXELS: 3316,
				GL_PACK_ROW_LENGTH: 3330,
				GL_PACK_SKIP_ROWS: 3331,
				GL_PACK_SKIP_PIXELS: 3332,
				GL_COLOR: 6144,
				GL_DEPTH: 6145,
				GL_STENCIL: 6146,
				GL_RED: 6403,
				GL_RGB8: 32849,
				GL_RGBA8: 32856,
				GL_RGB10_A2: 32857,
				GL_TEXTURE_BINDING_3D: 32874,
				GL_UNPACK_SKIP_IMAGES: 32877,
				GL_UNPACK_IMAGE_HEIGHT: 32878,
				GL_TEXTURE_3D: 32879,
				GL_TEXTURE_WRAP_R: 32882,
				GL_MAX_3D_TEXTURE_SIZE: 32883,
				GL_UNSIGNED_INT_2_10_10_10_REV: 33640,
				GL_MAX_ELEMENTS_VERTICES: 33000,
				GL_MAX_ELEMENTS_INDICES: 33001,
				GL_TEXTURE_MIN_LOD: 33082,
				GL_TEXTURE_MAX_LOD: 33083,
				GL_TEXTURE_BASE_LEVEL: 33084,
				GL_TEXTURE_MAX_LEVEL: 33085,
				GL_MIN: 32775,
				GL_MAX: 32776,
				GL_DEPTH_COMPONENT24: 33190,
				GL_MAX_TEXTURE_LOD_BIAS: 34045,
				GL_TEXTURE_COMPARE_MODE: 34892,
				GL_TEXTURE_COMPARE_FUNC: 34893,
				GL_CURRENT_QUERY: 34917,
				GL_QUERY_RESULT: 34918,
				GL_QUERY_RESULT_AVAILABLE: 34919,
				GL_STREAM_READ: 35041,
				GL_STREAM_COPY: 35042,
				GL_STATIC_READ: 35045,
				GL_STATIC_COPY: 35046,
				GL_DYNAMIC_READ: 35049,
				GL_DYNAMIC_COPY: 35050,
				GL_MAX_DRAW_BUFFERS: 34852,
				GL_DRAW_BUFFER0: 34853,
				GL_DRAW_BUFFER1: 34854,
				GL_DRAW_BUFFER2: 34855,
				GL_DRAW_BUFFER3: 34856,
				GL_DRAW_BUFFER4: 34857,
				GL_DRAW_BUFFER5: 34858,
				GL_DRAW_BUFFER6: 34859,
				GL_DRAW_BUFFER7: 34860,
				GL_DRAW_BUFFER8: 34861,
				GL_DRAW_BUFFER9: 34862,
				GL_DRAW_BUFFER10: 34863,
				GL_DRAW_BUFFER11: 34864,
				GL_DRAW_BUFFER12: 34865,
				GL_DRAW_BUFFER13: 34866,
				GL_DRAW_BUFFER14: 34867,
				GL_DRAW_BUFFER15: 34868,
				GL_MAX_FRAGMENT_UNIFORM_COMPONENTS: 35657,
				GL_MAX_VERTEX_UNIFORM_COMPONENTS: 35658,
				GL_SAMPLER_3D: 35679,
				GL_SAMPLER_2D_SHADOW: 35682,
				GL_FRAGMENT_SHADER_DERIVATIVE_HINT: 35723,
				GL_PIXEL_PACK_BUFFER: 35051,
				GL_PIXEL_UNPACK_BUFFER: 35052,
				GL_PIXEL_PACK_BUFFER_BINDING: 35053,
				GL_PIXEL_UNPACK_BUFFER_BINDING: 35055,
				GL_FLOAT_MAT2x3: 35685,
				GL_FLOAT_MAT2x4: 35686,
				GL_FLOAT_MAT3x2: 35687,
				GL_FLOAT_MAT3x4: 35688,
				GL_FLOAT_MAT4x2: 35689,
				GL_FLOAT_MAT4x3: 35690,
				GL_SRGB: 35904,
				GL_SRGB8: 35905,
				GL_SRGB8_ALPHA8: 35907,
				GL_COMPARE_REF_TO_TEXTURE: 34894,
				GL_RGBA32F: 34836,
				GL_RGB32F: 34837,
				GL_RGBA16F: 34842,
				GL_RGB16F: 34843,
				GL_VERTEX_ATTRIB_ARRAY_INTEGER: 35069,
				GL_MAX_ARRAY_TEXTURE_LAYERS: 35071,
				GL_MIN_PROGRAM_TEXEL_OFFSET: 35076,
				GL_MAX_PROGRAM_TEXEL_OFFSET: 35077,
				GL_MAX_VARYING_COMPONENTS: 35659,
				GL_TEXTURE_2D_ARRAY: 35866,
				GL_TEXTURE_BINDING_2D_ARRAY: 35869,
				GL_R11F_G11F_B10F: 35898,
				GL_UNSIGNED_INT_10F_11F_11F_REV: 35899,
				GL_RGB9_E5: 35901,
				GL_UNSIGNED_INT_5_9_9_9_REV: 35902,
				GL_TRANSFORM_FEEDBACK_BUFFER_MODE: 35967,
				GL_MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: 35968,
				GL_TRANSFORM_FEEDBACK_VARYINGS: 35971,
				GL_TRANSFORM_FEEDBACK_BUFFER_START: 35972,
				GL_TRANSFORM_FEEDBACK_BUFFER_SIZE: 35973,
				GL_TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN: 35976,
				GL_RASTERIZER_DISCARD: 35977,
				GL_MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 35978,
				GL_MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 35979,
				GL_INTERLEAVED_ATTRIBS: 35980,
				GL_SEPARATE_ATTRIBS: 35981,
				GL_TRANSFORM_FEEDBACK_BUFFER: 35982,
				GL_TRANSFORM_FEEDBACK_BUFFER_BINDING: 35983,
				GL_RGBA32UI: 36208,
				GL_RGB32UI: 36209,
				GL_RGBA16UI: 36214,
				GL_RGB16UI: 36215,
				GL_RGBA8UI: 36220,
				GL_RGB8UI: 36221,
				GL_RGBA32I: 36226,
				GL_RGB32I: 36227,
				GL_RGBA16I: 36232,
				GL_RGB16I: 36233,
				GL_RGBA8I: 36238,
				GL_RGB8I: 36239,
				GL_RED_INTEGER: 36244,
				GL_RGB_INTEGER: 36248,
				GL_RGBA_INTEGER: 36249,
				GL_SAMPLER_2D_ARRAY: 36289,
				GL_SAMPLER_2D_ARRAY_SHADOW: 36292,
				GL_SAMPLER_CUBE_SHADOW: 36293,
				GL_UNSIGNED_INT_VEC2: 36294,
				GL_UNSIGNED_INT_VEC3: 36295,
				GL_UNSIGNED_INT_VEC4: 36296,
				GL_INT_SAMPLER_2D: 36298,
				GL_INT_SAMPLER_3D: 36299,
				GL_INT_SAMPLER_CUBE: 36300,
				GL_INT_SAMPLER_2D_ARRAY: 36303,
				GL_UNSIGNED_INT_SAMPLER_2D: 36306,
				GL_UNSIGNED_INT_SAMPLER_3D: 36307,
				GL_UNSIGNED_INT_SAMPLER_CUBE: 36308,
				GL_UNSIGNED_INT_SAMPLER_2D_ARRAY: 36311,
				GL_DEPTH_COMPONENT32F: 36012,
				GL_DEPTH32F_STENCIL8: 36013,
				GL_FLOAT_32_UNSIGNED_INT_24_8_REV: 36269,
				GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING: 33296,
				GL_FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE: 33297,
				GL_FRAMEBUFFER_ATTACHMENT_RED_SIZE: 33298,
				GL_FRAMEBUFFER_ATTACHMENT_GREEN_SIZE: 33299,
				GL_FRAMEBUFFER_ATTACHMENT_BLUE_SIZE: 33300,
				GL_FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE: 33301,
				GL_FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE: 33302,
				GL_FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE: 33303,
				GL_FRAMEBUFFER_DEFAULT: 33304,
				GL_UNSIGNED_INT_24_8: 34042,
				GL_DEPTH24_STENCIL8: 35056,
				GL_UNSIGNED_NORMALIZED: 35863,
				GL_DRAW_FRAMEBUFFER_BINDING: 36006,
				GL_READ_FRAMEBUFFER: 36008,
				GL_DRAW_FRAMEBUFFER: 36009,
				GL_READ_FRAMEBUFFER_BINDING: 36010,
				GL_RENDERBUFFER_SAMPLES: 36011,
				GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER: 36052,
				GL_MAX_COLOR_ATTACHMENTS: 36063,
				GL_COLOR_ATTACHMENT1: 36065,
				GL_COLOR_ATTACHMENT2: 36066,
				GL_COLOR_ATTACHMENT3: 36067,
				GL_COLOR_ATTACHMENT4: 36068,
				GL_COLOR_ATTACHMENT5: 36069,
				GL_COLOR_ATTACHMENT6: 36070,
				GL_COLOR_ATTACHMENT7: 36071,
				GL_COLOR_ATTACHMENT8: 36072,
				GL_COLOR_ATTACHMENT9: 36073,
				GL_COLOR_ATTACHMENT10: 36074,
				GL_COLOR_ATTACHMENT11: 36075,
				GL_COLOR_ATTACHMENT12: 36076,
				GL_COLOR_ATTACHMENT13: 36077,
				GL_COLOR_ATTACHMENT14: 36078,
				GL_COLOR_ATTACHMENT15: 36079,
				GL_FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: 36182,
				GL_MAX_SAMPLES: 36183,
				GL_HALF_FLOAT: 5131,
				GL_RG: 33319,
				GL_RG_INTEGER: 33320,
				GL_R8: 33321,
				GL_RG8: 33323,
				GL_R16F: 33325,
				GL_R32F: 33326,
				GL_RG16F: 33327,
				GL_RG32F: 33328,
				GL_R8I: 33329,
				GL_R8UI: 33330,
				GL_R16I: 33331,
				GL_R16UI: 33332,
				GL_R32I: 33333,
				GL_R32UI: 33334,
				GL_RG8I: 33335,
				GL_RG8UI: 33336,
				GL_RG16I: 33337,
				GL_RG16UI: 33338,
				GL_RG32I: 33339,
				GL_RG32UI: 33340,
				GL_VERTEX_ARRAY_BINDING: 34229,
				GL_R8_SNORM: 36756,
				GL_RG8_SNORM: 36757,
				GL_RGB8_SNORM: 36758,
				GL_RGBA8_SNORM: 36759,
				GL_SIGNED_NORMALIZED: 36764,
				GL_COPY_READ_BUFFER: 36662,
				GL_COPY_WRITE_BUFFER: 36663,
				GL_COPY_READ_BUFFER_BINDING: 36662,
				GL_COPY_WRITE_BUFFER_BINDING: 36663,
				GL_UNIFORM_BUFFER: 35345,
				GL_UNIFORM_BUFFER_BINDING: 35368,
				GL_UNIFORM_BUFFER_START: 35369,
				GL_UNIFORM_BUFFER_SIZE: 35370,
				GL_MAX_VERTEX_UNIFORM_BLOCKS: 35371,
				GL_MAX_FRAGMENT_UNIFORM_BLOCKS: 35373,
				GL_MAX_COMBINED_UNIFORM_BLOCKS: 35374,
				GL_MAX_UNIFORM_BUFFER_BINDINGS: 35375,
				GL_MAX_UNIFORM_BLOCK_SIZE: 35376,
				GL_MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: 35377,
				GL_MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: 35379,
				GL_UNIFORM_BUFFER_OFFSET_ALIGNMENT: 35380,
				GL_ACTIVE_UNIFORM_BLOCKS: 35382,
				GL_UNIFORM_TYPE: 35383,
				GL_UNIFORM_SIZE: 35384,
				GL_UNIFORM_BLOCK_INDEX: 35386,
				GL_UNIFORM_OFFSET: 35387,
				GL_UNIFORM_ARRAY_STRIDE: 35388,
				GL_UNIFORM_MATRIX_STRIDE: 35389,
				GL_UNIFORM_IS_ROW_MAJOR: 35390,
				GL_UNIFORM_BLOCK_BINDING: 35391,
				GL_UNIFORM_BLOCK_DATA_SIZE: 35392,
				GL_UNIFORM_BLOCK_ACTIVE_UNIFORMS: 35394,
				GL_UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES: 35395,
				GL_UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER: 35396,
				GL_UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER: 35398,
				GL_INVALID_INDEX: 4294967295,
				GL_MAX_VERTEX_OUTPUT_COMPONENTS: 37154,
				GL_MAX_FRAGMENT_INPUT_COMPONENTS: 37157,
				GL_MAX_SERVER_WAIT_TIMEOUT: 37137,
				GL_OBJECT_TYPE: 37138,
				GL_SYNC_CONDITION: 37139,
				GL_SYNC_STATUS: 37140,
				GL_SYNC_FLAGS: 37141,
				GL_SYNC_FENCE: 37142,
				GL_SYNC_GPU_COMMANDS_COMPLETE: 37143,
				GL_UNSIGNALED: 37144,
				GL_SIGNALED: 37145,
				GL_ALREADY_SIGNALED: 37146,
				GL_TIMEOUT_EXPIRED: 37147,
				GL_CONDITION_SATISFIED: 37148,
				GL_WAIT_FAILED: 37149,
				GL_SYNC_FLUSH_COMMANDS_BIT: 1,
				GL_VERTEX_ATTRIB_ARRAY_DIVISOR: 35070,
				GL_ANY_SAMPLES_PASSED: 35887,
				GL_ANY_SAMPLES_PASSED_CONSERVATIVE: 36202,
				GL_SAMPLER_BINDING: 35097,
				GL_RGB10_A2UI: 36975,
				GL_INT_2_10_10_10_REV: 36255,
				GL_TRANSFORM_FEEDBACK: 36386,
				GL_TRANSFORM_FEEDBACK_PAUSED: 36387,
				GL_TRANSFORM_FEEDBACK_ACTIVE: 36388,
				GL_TRANSFORM_FEEDBACK_BINDING: 36389,
				GL_TEXTURE_IMMUTABLE_FORMAT: 37167,
				GL_MAX_ELEMENT_INDEX: 36203,
				GL_TEXTURE_IMMUTABLE_LEVELS: 33503,
				GL_TIMEOUT_IGNORED: -1,
				GL_MAX_CLIENT_WAIT_TIMEOUT_WEBGL: 37447
			})




			function webgl2_context(def) {
				def = def || {};
				let _canvas = def.canvas;
				if (!_canvas) {
					_canvas = document.createElement("canvas");
					_canvas.setAttribute("style", "position:absolute;left:0;top:0;width:calc(100%);height:calc(100%)");
				}
				def.screen_scale = def.screen_scale || 1;
				def.canvas = _canvas;
				//def.desynchronized = def.desynchronized || true;
				def.alpha = def.alpha || !true;
				def.depth = def.depth || true;
				def.stencil = def.stencil || true;
				def.antialias = def.antialias || false;
				def.premultipliedAlpha = def.premultipliedAlpha || false;
				def.preserveDrawingBuffer = def.preserveDrawingBuffer || true;
				def.xrCompatible = def.xrCompatible || false;

				let gl = def.context || _canvas.getContext('webgl2', def);

				this.available_extensions = gl.getSupportedExtensions();
				gl.getExtension("EXT_color_buffer_float");
				gl.getExtension("OES_texture_float_linear");
				gl.getExtension("EXT_texture_filter_anisotropic");

				gl.pixel_ratio = def.pixel_ratio || window.devicePixelRatio;

				_canvas.addEventListener('webglcontextlost', function () {
					console.log('webglcontextlost', this);
				}, false);

				_canvas.addEventListener('webglcontextrestored', function () {
					console.log('webglcontextrestored', this);
				}, false);

				gl.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
				gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
				gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

				gl.clearColor(0, 0, 0, 0);
				const canvas_resized = new CustomEvent("canvas_resized", {});
				const observer = new ResizeObserver(function (entries) {
					const entry = entries[0];

					// entry.devicePixelContentBoxSize is an array
					const width = entry.devicePixelContentBoxSize[0].inlineSize;
					const height = entry.devicePixelContentBoxSize[0].blockSize;

					_canvas.width = width * def.screen_scale;
					_canvas.height = height * def.screen_scale;
					gl.resized = true;
					_canvas.dispatchEvent(canvas_resized);
				});
				def.gl = gl;
				observer.observe(_canvas);

				return def;
      }


			return webgl2_context;


		});
	});

	packing.register("object_stack", function () {

		packing("stack")("object_stack", function (stack) {


			function object_stack(apply) {
				const _stack = new stack();
				
				const s = {
					_stack: _stack,
					current:null,
					push: push,
					pop: pop
				};
				function push(item) {
					if (s.current) _stack.push(s.current);
					s.current = item;
					apply(item);
					return s.current;
				}

				function pop() {
					s.current = _stack.pop();
					apply(s.current);
					return s.current;
				}

				return s;

			}

			return object_stack;



		});
	});

	packing.register("hash_str", function () {

		packing()("hash_str", function () {

			function hash_str(str) {
				var hash = 2166136261;
				for (var i = 0; i < str.length; i++) {
					hash ^= str.charCodeAt(i);
					hash = Math.imul(hash, 16777619);
				}
				return hash >>> 0;
			}

			return hash_str;



		});
	});

	packing.register("query_string", function () {

		packing()("query_string", function () {



			const query_string = {
				parse: function (query) {
					var params = {};
					query = (query || "").replace(/^\?/, '');

					if (!query) return params;

					var pairs = query.split('&');
					var i, pair, key, value;

					for (i = 0; i < pairs.length; i++) {
						pair = pairs[i].split('=');
						key = decodeURIComponent(pair[0]);
						value = pair.length > 1 ? decodeURIComponent(pair[1]) : '';

						// Parse the value
						value = this.parse_value(value);

						// Handle duplicate keys
						if (params.hasOwnProperty(key)) {
							if (Array.isArray(params[key])) {
								params[key].push(value);
							} else {
								params[key] = [params[key], value];
							}
						} else {
							params[key] = value;
						}
					}

					return params;
				},

				parse_value: function (value) {
					// Convert boolean strings
					var lower = value.toLowerCase();
					if (lower === 'true') return true;
					if (lower === 'false') return false;

					// Convert numeric strings
					if (value !== '' && !isNaN(value)) {
						return Number(value);
					}

					// Return as string
					return value;
				},

				get: function (key, query) {
					var params = this.parse(query);
					return params.hasOwnProperty(key) ? params[key] : null;
				},

				stringify: function (params) {
					var parts = [];
					for (var key in params) {
						if (params.hasOwnProperty(key)) {
							var value = params[key];
							if (Array.isArray(value)) {
								for (var i = 0; i < value.length; i++) {
									parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value[i]));
								}
							} else {
								parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
							}
						}
					}
					return parts.join('&');
				}
			};

			return query_string;



		});
	});

	packing.register("str_uint8", function () {
		packing()("str_uint8", function () {
			const str_uint8 = function (str, pad, buff, offset) {
				pad = pad || 0;
				let arr;
				if (ArrayBuffer.isView(buff)) {
					arr = buff;
				}
				else {
					if (buff) {
						if (pad > 0) {
							arr = new Uint8Array(buff, offset || 0, (str.length + (pad - (str.length % pad))));
						}
						else {
							arr = new Uint8Array(buff, offset || 0, str.length);
						}
					}
					else {
						if (pad > 0) {
							arr = new Uint8Array((str.length + (pad - (str.length % pad))));
						}
						else {
							arr = new Uint8Array(str.length);
						}
					}
        }
			
				//arr.fill(0);
				for (let i = 0; i < str.length; i++) {
					arr[i] = str.charCodeAt(i);
				}
				return arr;
			};
			return str_uint8;
		});
	});

	packing.register("uint8_str", function () {
		packing()("uint8_str", function () {
			const uint8_str = function (arr) {
				let m = "";
				for (let i = 0; i < arr.length; i++) {
					m += String.fromCharCode(arr[i]);
				}
				return m;
			};

			return uint8_str;

		});
	});


	packing.register("events", function () {

		packing("define")("events", function (define) {



			this.event = define(function (proto) {
				let i = 0, ret;
				proto.add = function (cb, callee) {
					callee = callee || this.owner;
					this.handlers[this.handlers.length] = [cb, callee];
					return callee;
				};
				proto.trigger = function (params) {
					if (this.handlers.length > 0) {
						for (i = 0; i < this.handlers.length; i++)
							if (this.handlers[i][0].apply(this.handlers[i][1], params) === false) return false;
					}

				};


				proto.trigger_params = function () {
					if (this.handlers.length > 0) {
						for (i = 0; i < this.handlers.length; i++)
							if (this.handlers[i][0].apply(this.handlers[i][1], this.params) === false) return false;
					}

				};



				return function event(owner, params) {
					this.owner = owner;
					this.handlers = [];
					this.params = params;
				};
			});


			return this;

		});
	});


	packing.register("create_worker", function () {

		packing()("create_worker", function () {
			function fake(src) {
				const base = this;
				base.remote = {};
				let initial_post_msg;
				base.postMessage = function (mm) {
					initial_post_msg = mm;
					console.log("base.postMessage", mm);
				};

				const xtp = new XMLHttpRequest();
			
				xtp.onload = function () {
					let call_now ;
					const self = base.remote;

					const m = {};
					function pass_base_msg() {
						console.log("pass_base_msg", m.data);
						base.onmessage(m);
					}

					function pass_self_msg() {
						console.log("pass_self_msg", m.data);
						self.onmessage(m);
					}

					self.postMessage = function (mm) {						
						if (Array.isArray(mm)) {
							m.data = mm;
							//base.onmessage(m);
							//call_now.push(base);
							call_now = base;

						}
						else {
							m.data = mm;
							//base.onmessage(m);
							//call_now.push(base);
							call_now = base;
						//	base.onmessage({ data: JSON.parse(JSON.stringify(mm))});
            }
						
						
						//requestAnimationFrame(pass_base_msg);
					};
					
					base.postMessage = function (mm) {
						
						if (Array.isArray(mm)) {
						
							m.data = mm;
							//self.onmessage(m);
							call_now = self;
							//call_now.push(self);



						}
						else {
							m.data = mm;
							call_now = self;
							//call_now.push(self);

							//self.onmessage(m);
							//self.onmessage({ data: JSON.parse(JSON.stringify(mm)) });
						}
						//self.onmessage(m);
						//requestAnimationFrame(pass_self_msg);
					};


					//console.log(this.response);
					const func = new Function("self", this.response);
					func(self);
					if (initial_post_msg) {

						m.data = initial_post_msg;
						initial_post_msg = null;
						//self.onmessage(m);
					}
					this.abort();
					setInterval(function () {
						if (call_now) {
							call_now.onmessage(m);
						}
						return;
						if (call_now.length > 0) {
							call_now.shift().onmessage(m);
            }
					}, 20);
				};
				xtp.onerror = function () {
					console.log("onerror", this.response);
				};
				xtp.responseType = "text";
				xtp.open("GET", src, true);
				xtp.send();
      }

			function create_worker(func,use_fake) {
				let wsource = "";
				if (Object.prototype.toString.call(func) === "[object String]") {
					wsource = func;
				}
				else {
					wsource = func.toString();
				}
				let W = Worker;
				if (use_fake) W = fake;
				const wrk = new W(URL.createObjectURL(new Blob(['(' + wsource + ')(self);'])));				
				return wrk;

			}


			return create_worker;



		});
	});


	packing.register("timer", function () {

		packing()("timer", function () {
			return function (cb, req_time_delta) {

				req_time_delta = req_time_delta || (1 / 60);
				let timer, current_time_delta, last_timer = 0, fps_timer = 0, fps_counter = 0, fps = 0;
				let _requestAnimationFrame;
				if (typeof window == "undefined") {
					_requestAnimationFrame = function (cb) {
						setTimeout(cb, req_time_delta * 1000);
					}
				} else {
					_requestAnimationFrame = requestAnimationFrame;

				}

				function call() {
					timer = performance.now() * 0.001;

					current_time_delta = timer - last_timer;

					if (current_time_delta < req_time_delta) {
						return;
					}

					current_time_delta = Math.max(req_time_delta, current_time_delta);



					cb(timer, current_time_delta, fps);
					last_timer = timer - (current_time_delta % req_time_delta);


					if (timer - fps_timer >= 1) {
						fps = fps_counter;
						fps_timer = timer;
						fps_counter = 0;
					}
					else fps_counter++;
				}

				function step1() {
					_requestAnimationFrame(step2);
					call();
				}
				function step2() {
					_requestAnimationFrame(step1);
					call();
				}
				step1();

			}


			return function (cb, req_time_delta) {
				// Fixed update interval (16.666... ms for 60 FPS)
				const TICK = (req_time_delta * 1000) || (1000 / 60);  // milliseconds per update


				let accumulator = 0;
				let lastTime = performance.now();

				// FPS counter variables
				let frameCount = 0;
				let fpsTimer = performance.now();
				let currentFPS = 0;

				function gameLoop(currentTime) {
					// ----- 1. Delta time -----
					const delta = currentTime - lastTime;
					lastTime = currentTime;

					// ----- 2. Accumulate & update -----
					accumulator += delta;
					while (accumulator >= TICK) {

						cb(currentTime, delta / 1000, currentFPS);
						accumulator -= TICK;
					}



					// ----- 4. FPS counter (every second) -----
					frameCount++;
					if (currentTime - fpsTimer >= 1000) {
						currentFPS = frameCount;
						frameCount = 0;
						fpsTimer = currentTime;
					}

					// ----- 5. Next frame -----
					requestAnimationFrame(gameLoop);
				}

				// Start the loop
				requestAnimationFrame(gameLoop);

			}

			function timer(cb, req_time_delta) {
				// Fixed update interval
				const TICK = (req_time_delta*1000) || (1000 / 60); // milliseconds per update
				const TICK_SECONDS = TICK / 1000; // Convert to seconds for physics

				let accumulator = 0;
				let lastTime = performance.now();

				// FPS counter
				let updateCount = 0;
				let fpsTimer = performance.now();
				let currentFPS = 0;

				function gameLoop(currentTime) {
					// ----- 1. Delta time (cap to prevent spiral of death) -----
					let delta = currentTime - lastTime;
					lastTime = currentTime;

					// Cap delta to prevent huge jumps (e.g., when tab is unfocused)
					if (delta > 100) delta = 100;

					// ----- 2. Accumulate & update -----
					accumulator += delta;
					let updatesThisFrame = 0;

					// Run as many fixed updates as needed
					while (accumulator >= TICK) {
						// Pass TICK_SECONDS as the fixed timestep, NOT delta/1000
						cb(currentTime, TICK_SECONDS, currentFPS);
						accumulator -= TICK;
						updatesThisFrame++;
					}

					// ----- 3. FPS counter (count actual updates) -----
					updateCount += updatesThisFrame;
					if (currentTime - fpsTimer >= 1000) {
						currentFPS = updateCount;
						updateCount = 0;
						fpsTimer = currentTime;
					}

					// ----- 4. Next frame -----
					requestAnimationFrame(gameLoop);
				}

				// Start the loop
				requestAnimationFrame(gameLoop);
			}
			return timer;

		

			

		});

	});

	packing.register("dom", function () {

		packing("guid","define")("dom", function (guid,define) {
			const dom = this;

			NodeList.prototype.map = Array.prototype.map;
      NodeList.prototype.forEach = Array.prototype.forEach;


			const is_dom_element = function (obj) {
				try {
					return (obj instanceof HTMLElement || (obj.textContent !== undefined));

				}
				catch (e) {
					return (typeof obj === "object") &&
						(obj.nodeType === 1) && (typeof obj.style === "object") &&
						(typeof obj.ownerDocument === "object");
				}
			}

			const ext = function (o, e) {
				if (e) {
					let co;
					for (let k in e) {
						if (k == "style") {
							Object.assign(o.style, e[k]);
						}
						else if (k == "abs$") {
							o.style.position = "absolute";
							o.style.left = e[k][0] || "0px";

							o.style.top = e[k][1] || "0px";



						}
						else if (k == "style$") {
							o.setAttribute("style", e[k]);
						}
						else if (k == "html$") {
							o.innerHTML = e[k];
						}
						else if (k == "class$") {
							e[k].split(' ').forEach(function (a) {
								o.classList.add(a);
							})

						}
						else if (k == "options$") {
							dom.$.select.set_options(o, e[k]);
						}
						else if (k == "css$") {
							dom.css(e[k]);
						}
						else if (k == "append$") {
							co = e[k];
							if (define.is_string(co)) co = document.querySelector(co);
							if (co) co.appendChild(o);
						}
						else if (k == "prepend$") {
							co = e[k];
							if (define.is_string(co)) co = document.querySelector(co);
							if (co) co.insertBefore(o, co.firstChild);

						}
						else if (k == "component$") {
							dom.component(o, e[k]);
						}
						else if (k == "attritutes$") {
							Object.assign(o.style, e[k]);
							Object.keys(e[k]).forEach(function (a) {
								o.setAttribute(a, e[k][a]);
							});
						}
						else if (/\$\$\w+/.test(k)) {
							o[k.replace("$$", "")] = o[k.replace("$$", "")] || [];
							if (Array.isArray(e[k])) {
								e[k].forEach(function (itm) {
									o[k.replace("$$", "")].push(itm);
								})
							}
							else o[k.replace("$$", "")].push(e[k]);
						}
						else if (/\$\w+/.test(k)) {
							o.setAttribute(k.replace("$", ""), e[k]);
						}
						else if (k == "size$") {
							o.style.width = e[k];
							o.style.height = e[k];


						}
						else if (/\w+\$/.test(k)) {
							o.style[k.replace("$", "")] = e[k];
						}
						else {
							if (o.set_object) {
								o.set_object(k, e);
							}
							else {
								if (define.is_function(e[k]) && k.indexOf("@") == 0) {
									o.addEventListener(k.replace("@", ""), e[k]);
								}
								else o[k] = e[k];

							}

						}

					}
				}

				return o;
			}
			const headloadings = [], bodyloadings = [];
			dom.css = function (css) {
				let style = document.createElement("style");
				style.type = 'text/css'
				if (style.styleSheet) {
					style.styleSheet.cssText = css;
				} else {
					if (Array.isArray(css)) {
						style.appendChild(document.createTextNode(css.join("")));
					}
					else {
						style.appendChild(document.createTextNode(css));
					}

				}
				dom.add_head(style);

			}
			dom.add_head = function (e) {
				if (document.head) document.head.appendChild(e);
				else headloadings.push(e);
			};
			dom.add_body = function (e) {
				if (document.body) {
					document.body.appendChild(e);
				}
				else bodyloadings.push(e);
				return e;
			};

			dom.load_js = function (url) {
				if (Array.isArray(url)) {
					const pro = [];
					url.forEach(function (u) {
						pro.push(new Promise(function (resolve) {
							const scr = document.createElement("script");
							scr.onload = resolve;
							scr.src = u;
							document.body.appendChild(scr);
						}));
					})
					return Promise.all(pro)
				}

				else {
					return new Promise(function (resolve) {

						const scr = document.createElement("script");
						scr.onload = resolve;
						scr.src = url;
						document.body.appendChild(scr);

					});

				}


			};

			document.addEventListener("DOMContentLoaded", function () {
				headloadings.forEach(function (e) {
					document.head.appendChild(e);
				});
				bodyloadings.forEach(function (e) {
					document.body.appendChild(e);
				});
			});
			dom.elm = function (n) {
				return document.createElement(n);
			};
			dom.strstr = function (str, arg1, arg2, arg3, arg4, arg5) {
				str = "var arr=[];arr.push('" + str
					.replace(/\n/g, "\\n")
					.replace(/[\r\t]/g, " ")
					.split("<?").join("\t")
					.replace(/((^|\?>)[^\t]*)'/g, "$1\r")
					.replace(/\t=(.*?)\?>/g, "',$1,'")
					.split("\t").join("');")
					.split("?>").join("arr.push('")
					.split("\r").join("\\'")

					+ "');return arr.join('');";
				return new Function(arg1, arg2, arg3, arg4, arg5, str);
			};


			dom.def_props = function (o, props) {
				for (let k in props) {
					Object.defineProperty(o, k, { set: props[k][0], get: props[k][1] });
				}

			};

			dom.elm$ = (function () {
				let _html$ = document.createElement('div');
				let e$;
				return function (html) {
					_html$.innerHTML = html;
					e$ = _html$.firstChild;
					_html$.removeChild(e$);
					return e$;
				}
			})();

			const components = { ___loaded: {} };
			dom.components = components;
			dom.$ = components;
			function func_add() {
				if (arguments.length == 1) return this.appendChild(arguments[0]);
				const ret = [];
				for (let i = 0; i < arguments.length; i++) {
					ret[i] = arguments[i];
					this.appendChild(ret[i]);
				}
				return ret;
			}


			function check_str_arg(d, str) {

				if (str.indexOf("##css") === 0) {
					d.cssid = d.cssid || ("css" + dom.guidi());
					d.classList.add(d.cssid);
					str = str.replace("##css", "");
					dom.css(str.replace(/\[cssid\]/g, "." + d.cssid));


					return false;
				}
				else if (str.indexOf("##") === 0) {
					str = str.replace("##", "");
					if (str.indexOf(",") > 0) {
						str.split(",").forEach(function (s) {
							d.classList.add(s.trim());
						});
					}
					else d.classList.add(str);
					return false;
				}
				else if (str.indexOf("$$") === 0) {
					str = str.replace("$$", "");
					d.setAttribute("style", str);
					return false;
				}

				return true;
			}



			function _component(d, args, start) {
				start = start || 0;
				d.add = func_add;
				if (args.length + start == 1) {
					if (Array.isArray(args[0])) {
						d = _component(d, args[0]);
					}
					else if (define.is_string(args[0])) {
						if (check_str_arg(d, args[0])) {
							d.innerHTML = args[0];
						}


					}
					else if (is_dom_element(args[0])) {
						d.appendChild(args[0]);
					}
					else if (define.is_function(args[0]) && args[0].name) {
						d[args[0].name] = args[0];
						if (args[0].name == "create") {
							args[0](d);
						}
					}
					else if (define.is_object(args[0])) {
						d = ext(d, args[0]);
					}

					return d;
				}

				for (let i = start; i < args.length; i++) {
					if (Array.isArray(args[i])) {
						d = _component(d, args[i]);

					}
					else if (define.is_string(args[i])) {
						if (check_str_arg(d, args[i])) {
							if (args[i].length > 0) d.appendChild(ext(dom.elm("span"), { pointerEvents$: "none", innerHTML: args[i] }));
						}


					}
					else if (is_dom_element(args[i])) {
						d.appendChild(args[i]);
					}
					else if (define.is_function(args[i]) && args[i].name) {
						d[args[i].name] = args[i];
						if (args[i].name == "create") {
							args[i](d);
						}
					}
					else if (define.is_object(args[i])) {
						d = ext(d, args[i]);
					}
				}


				return d;
			}

			function component(name) {
				return function () {
					return _component(dom.elm(name), arguments);

				}
			};
			function padString(str, pad) {
				return (pad.substring(0, pad.length - str.length) + str);
			};

			dom.component = _component;
			[
				"a", "abbr", "address", "area", "article", "aside", "audio", "b", "base",
				"bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption",
				"cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details",
				"dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption",
				"figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head",
				"header", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label",
				"legend", "li", "link", "main", "map", "mark", "math", "menu", "meta", "meter",
				"nav", "noscript", "object", "ol", "optgroup", "option", "output", "p",
				"param", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp",
				"script", "search", "section", "select", "slot", "small", "source", "span",
				"strong", "style", "sub", "summary", "sup", "svg", "table", "tbody", "td",
				"template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track",
				"u", "ul", "var", "video", "wbr"
			].forEach(function (a) {
				components[a] = components[a] || (component(a));
			});
			components["checkbox"] = function checkbox() {
				const e = _component(dom.elm("input"), arguments);
				e.setAttribute("type", "checkbox");
				return e;
			};

			dom.create_event = function (name, params) {
				return new CustomEvent(name, params);
			};

			dom.$ = components;

			dom.auto_resize = function (canv, cb) {
				const rect = canv.getBoundingClientRect();
				if (Math.floor(rect.width) !== canv.width || Math.floor(rect.height) !== canv.height) {
					canv.width = rect.width;
					canv.height = rect.height;
					if (cb) cb(canv.width, canv.height);
				}
			};

			dom.display_status = function display_status() {
				const e = dom.elm("table");
				e.style.width = "100%";
				e.style.zIndex = 1000;
				dom.component(e, arguments);
				e.params = e.params || {};

				window.epr = e;
				const elms = {};
				let k;
				e.add_element = function (elm) {
					this.appendChild(dom.$.tr(dom.$.td(elm)));
					return this;
				};
				e.checkbox = function (name, value, cb, dv) {

					const chk = dom.$.checkbox({
						checked: value, oninput: cb
					});

					dv = dv || this;
					dv.appendChild(dom.$.div(dom.$.label(chk, name)));

					return chk;
				}

				
				setTimeout(function () {
					setInterval(function () {

						
						if (e.update) {
							e.update(e.params);
						}
						for (k in e.params) {
							if (!elms[k]) {
								elms[k] = dom.elm("tr");
								elms[k].innerHTML = '<td>' + k + '</td><td></td>';
								e.appendChild(elms[k]);
								elms[k].firstChild.style.textAlign = "left";
								elms[k].lastChild.style.textAlign = "right";
								elms[k] = elms[k].lastChild;
							}
							elms[k].innerText = e.params[k];

						}

					}, e.delay || 500);

					if (e.parentNode === null) {
						document.body.appendChild(e);
					}

				}, 1000);
				return e;
			};

			dom.use_mouse = (function () {
				dom.disable_right_click = function () {
					document.addEventListener('contextmenu', function (e) {
						e.preventDefault()
					});
					return this;
				};
				const overlay = _component(dom.elm("div"), [{ $style: 'position:absolute;left:0;top:0;right:0;bottom:0;background-color:gray;display:none;opacity:0;z-index:99999' }]);
				dom.add_body(overlay);
				return function (elm) {


					let mouse_down_x = undefined, mouse_down_y = undefined;
					elm.mouse_draging = false;
					elm.mouse_drag_buttons = -1;
					elm.mouse_drag_start_buttons = -1;
					elm.mouse_down_buttons = -1;
					elm.mouse_click_buttons = -1;

					elm.hover_dx = 0;
					elm.hover_dy = 0;



					function mouse_move(e) {
						elm.hover_dx = e.clientX - elm.mouse_x;
						elm.hover_dy = e.clientX - elm.mouse_y;


						elm.mouse_x = e.clientX;
						elm.mouse_y = e.clientY;

						if (mouse_down_x === undefined) {
							mouse_down_x = elm.mouse_x;
						}

						if (mouse_down_y === undefined) {
							mouse_down_y = elm.mouse_y;
						}

						let dx = elm.mouse_x - mouse_down_x;
						let dy = elm.mouse_y - mouse_down_y;

						mouse_down_x = e.clientX;
						mouse_down_y = e.clientY;
						
						elm.mouse_drag_buttons = e.buttons;
						elm.mouse_drag_start_buttons = -1;
						if (elm.mouse_drag && elm.mouse_drag(dx, dy, e) !== false) {
							if (e.buttons !== 0) {
								elm.mouse_draging = true;
              }
						}


					}

					function mouse_up(e) {
						
						overlay.style.display = "none";
						document.removeEventListener("mousemove", mouse_move);
						document.removeEventListener("mouseup", mouse_up);
					
						if (!elm.mouse_draging) {
							elm.mouse_click_buttons = elm.mouse_down_buttons;
							if (elm.mouse_click)		elm.mouse_click(elm.mouse_x, elm.mouse_y, elm.mouse_down_buttons);
						}
						elm.mouse_drag_buttons =-1;
						elm.mouse_drag_start_buttons = -1;
						elm.mouse_down_buttons = -1;
						elm.mouse_draging = false;
					
					}
					elm.addEventListener("mousedown", function (e) {
						mouse_down_x = e.clientX;
						mouse_down_y = e.clientY;
						elm.mouse_x = e.clientX;
						elm.mouse_y = e.clientY;
						elm.mouse_down_buttons = e.buttons;
						overlay.style.display = "unset";
						document.addEventListener("mousemove", mouse_move);
						document.addEventListener("mouseup", mouse_up);
						elm.mouse_click_buttons = -1;

						elm.mouse_drag_start_buttons = elm.mouse_down_buttons;
						if (elm.mouse_drag_start && elm.mouse_drag_start(mouse_down_x,mouse_down_y,e) !== false) {

						}

					});


					elm.addEventListener(/Firefox/i.test(navigator.userAgent) ? "DOMMouseScroll" : "mousewheel", function (e) {
						let delta = (e.detail ? e.detail * -120 : e.wheelDelta) * 0.5;
						let rect = elm.getBoundingClientRect();
						e.stopPropagation();
						if (elm.mouse_wheel && elm.mouse_wheel(delta, e.clientX - rect.lef, e.clientY - rect.top, e) === false) return;
					}, false);


					elm.addEventListener("mousemove", mouse_move);

					return elm;
				}

			})();



			dom.css(`
        .collapseable {
          border:solid 1px gray;
          padding-top:24px;
          position:relative;
        }

        .collapseable .header {
          position:absolute;
          top:0px;left:0px;
          padding:4px;
          background-color:rgb(100,100,100,0.8);
          padding-left:16px;
          right:0;
          cursor:pointer;
        }

        .collapseable .header:before {
          content:"-";
          position:absolute;
          left:4px;
        }

        

        .collapseable.collapsed  {
           padding-top:0;
           height:24px !important;
        }

        .collapseable.collapsed .header:before {
          content:"+";
        }

        .collapseable.collapsed > * {
          display:none  !important;
        }
        .collapseable.collapsed  > *:last-child {
          display:block !important;
          position:relative;
        }

        .area_map_selector   .area_map_selector_div{
          width:auto !important;
          height:auto !important;
          overflow:visible !important;

        }
        .overlay .area_map_selector_div {
          margin-left:0px !important;
          margin-top:0px !important;

        }

        `);


			dom.css(`
body * {
user-select:none;
overflow-wrap: anywhere;
}

body input[type="range"],body input[type="text"] {
width:100%;
}

.hover-opacity:hover{
opacity:1 !important;

}
.resizer {position:absolute;left:calc(100% - 10px);top:calc(100% - 10px);user-select: none;pointer-events:fill;cursor: nw-resize;opacity:0;}
.resizer::after {content:"+";position:absolute;left:0;top:0;color:white;}
body {background-color:black;color:white;}
body  *::-webkit-scrollbar{width: 10px;height:10px; background-color:rgba(100,100,100,0.5)}
body *::-webkit-scrollbar-thumb{background-color:rgba(100,100,100,0.75)}
.resizable_div {position:relative;border:solid 1px rgba(50,50,50,0.5);}
.resizable_div_vresizer {position:absolute;left:0;right:0;top:0px;height:8px;background-color:gray;opacity:0;cursor: n-resize;user-select: none;z-index:999999;pointer-events:fill;}
.resizable_div_hresizer {position:absolute;right:-4px;top:0;bottom:0;width:8px !important;background-color:gray;opacity:0;cursor: e-resize;user-select: none;z-index:999999;pointer-events:fill;}
.resizable_div_hlresizer {position:absolute;left:-4px;top:0;bottom:0;width:8px !important;background-color:gray;opacity:0;cursor: e-resize;user-select: none;z-index:999999;pointer-events:fill;}

.resizable_div_resizer {position:absolute;right:-2px;bottom:-2px;width:8px;height:8px;background-color:gray;opacity:0;cursor: nw-resize;user-select: none;z-index:999999;pointer-events:fill;}
.resizable_div_dragger {position:absolute;left:0;right:0;top:0;height:20px;background-color:gray;opacity:0;cursor: move;user-select: none;z-index:999999;pointer-events:fill;}
.node_canvas {background-color:black;}
.node_canvas .node {position:absolute;pointer-events:fill;width:auto;height:auto;display:inline-block;min-width:30px;min-height:20px;border:solid 1px silver;}

.treeview {display:inline-block;margin:1px;padding:2px;}
.treeview li{padding:2px;list-style:none;position:relative;float:left;margin:1px;width:100%;height:auto;cursor:pointer;}
.treeview li >div {display:block;user-select:none;padding-left:16px;border:solid 1px transparent;}
.treeview li >div:hover {border:solid 1px silver;}
.treeview li >.folder::before{content:'+';position:absolute;left:3px;}

.treeview li >.folder > span {pointer-events:none;}
.treeview li.expanded > .folder::before{content:'-';}
.treeview li >ul {display: none !important;pointer-events:fill;margin:1px;padding:2px;}
.treeview li.expanded >ul {display:inline-table !important;width:100%;}
.menu,.menu ul {position:absolute;background-color:silver;color:black;left:20px;top:20px;margin:0;min-width:100px;padding:0px;display:none;}
.menu li {list-style: none; list-style-image: none; width: calc(100% - 10px); padding: 5px;user-select: none;background-color:silver;}
.menu li.submenu {position:relative;}
.menu li.submenu::after {content:"\\00bb";position: absolute;right: 5px;}		
.menu li:hover  {background-color:gray;color:white;z-index:9999;}
.menu li >ul {display1:none;left:100%;top:0;}
.menu li:hover >ul {display:unset;}

.item-list  {background-color:transparent;color:blue;width:100%;pointer-events:none;user-select: none;}
.item-list > div  {background-color:white;pointer-events:fill;padding:3px;user-select: none;}
.item-list > div:hover  {background-color:blue;color:white;}



ul.tabs {position:absolute;left:0;top:0;width:100%;margin:0;padding:0;}
ul.tabs > li.tab_item > span {text-align: center;}
ul.tabs > li.tab_item {list-style: none;list-style-image: none;user-select: none;
  color:silver;background-color:rgba(50,50,50,0.5);display:inline-block;min-width:50px;border-top-left-radius: 5px;border-top-right-radius: 5px;padding-left: 5px;padding-right: 5px;margin-left:5px;}
ul.tabs > li.tab_item.selected,ul.tabs > li.tab_item:hover {background-color:rgba(80,80,80,0.5);color:gray;}
ul.tabs > li.tab_item > div {position:absolute;display:none;left:0;margin-bottom:calc(-100% + 2px);width:100%;background-color:rgba(80,80,80,0.5);;}
ul.tabs > li.tab_item.selected > div {display:block;height:calc(100%);border:solid 0px red;}
.div_window {}
.div_window .div_window_dragger{position:absolute;left:0;top:0;right:0;height:20px;background-color:rgba(100,100,100,0.75);font-size:80%;padding:2px}
.div_window .div_window_collapser {position:absolute;right:1px;top:1px;height:20px;color:#000000;width:20px;transform:scale(1.4);

pointer-events:fill;
cursor:pointer;
z-index:9999;
}
.div_window.div_window_collapsed * {
height:0 !important;
}



.div_window .div_window_collapser:before {
            content:"-";
           }
.div_window.div_window_collapsed .div_window_collapser:before {
            content:"+";
           }

.div_window.div_window_collapsed {
  height:20px !important;
  overflow:hidden;
}

.div_window.div_window_collapsed .div_window_dragger {
height:20px !important;            
}

.div_pointerless {
pointer-events:none !important;
}

.div_pointerless >  * {
pointer-events:fill;
}

.div_button {
border:solid 2px silver;
background-color:gray;
}

.overlay {
position:absolute;left:0;top:0;right:0;bottom:0;background-color:red;display:none;opacity:0;
}

.overlay_dialog {
position:absolute;left:50%;top:50%;
background-color:rgba(140,140,140,0.9);
padding:5px;

}

.overlay_dialog >table  >.buttons   {
padding-bottom:10px;
}
.overlay_dialog >table  >.buttons >td  {
width:50%;
}


           

`);


			let zindex = 99999;
			const overlays = [];
			dom.get_overlay = function () {
				if (overlays.length > 0) {

					const o = dom.add_body(overlays.pop());

					return o;
				}
				const overlay = dom.$.div({ class$: 'overlay' });

				console.log("overlays", overlay);

				overlay.show = function (elm, bring_to_front) {
					this.diag.style.display = "none";
					this._auto_dismis = false;
					this.style.opactiy = 0;
					this.style.zIndex = (zindex++);
					this.style.display = "unset";
					this.is_modal = false;
					if (elm) {
						elm.style.display = "unset";
						if (bring_to_front) elm.style.zIndex = (zindex++);

						this.style.cursor = window.getComputedStyle(elm).cursor;

					}
					else { zindex++; };

					this.elm = elm;
					return this;
				};



				function create_diag(overlay) {
					let diag;
					const ok_button = dom.$.button("Ok", function onclick() {
						if (diag.confirm && diag.confirm() != false) {
							overlay.dismis();
						}
					});

					const cancel_button = dom.$.button("cancel", function onclick() {
						overlay.dismis();
					});

					diag = dom.$.div({ class$: "overlay_dialog" }, dom.$.table(
						dom.$.tr(dom.$.td({ $colspan: "2", class$: "content" })),
						dom.$.tr({ class$: "buttons" },
							dom.$.td(cancel_button),
							dom.$.td({ $align: "right" }, ok_button))
					));
					diag.ok_button = ok_button;
					diag.cancel_button = cancel_button;
					diag.last_content = null;
					diag.last_content_parent = null;
					diag.init = function (content, opts) {
						ok_button.innerHTML = opts.ok_title || "Ok";
						cancel_button.innerHTML = opts.cancel_title || "cancel";
						this.confirm = opts.confirm || null;
						if (this.last_content) {
							this.last_content_parent.appendChild(this.last_content);

						}
						this.last_content = content;
						this.last_content_parent = content.parentNode || document.body;
						this.querySelector(".content").appendChild(content);

						overlay.is_modal = opts.modal;

					};
					return diag;
				}

				overlay.diag = create_diag(overlay);





				dom.add_body(overlay.diag);

				overlay.diag.style.display = "none";
				overlay.show_dialog = function (content, opts) {
					this._auto_dismis = false;
					this.style.opactiy = 0;
					this.style.zIndex = (zindex++);
					this.style.display = "unset";
					this.diag.init(content, opts || {});
					this.diag.style.display = "unset";
					this.diag.style.zIndex = (zindex++);
					const rect = this.diag.getBoundingClientRect();
					this.diag.style.marginLeft = (-rect.width * 0.5) + "px";
					this.diag.style.marginTop = (-rect.height * 0.5) + "px";

					return this.diag;
				};


				overlay.auto_dismis = function () {
					this._auto_dismis = true;
					return this;
				};

				overlay.dismis = function () {
					zindex -= 2;
					this.style.display = "none";
					if (this.elm && this.elm.dismis) {
						// this.elm.style.zIndex = "unset";
						this.elm.dismis();

					}
					this.diag.style.display = "none";
					overlays.push(this);
				};
				overlay.onmousedown = function () {
					if (!this.is_modal) this.dismis();
				};
				overlay.onmousemove = function () {
					if (this._auto_dismis) this.dismis();
				};

				dom.add_body(overlay);
				return overlay;
			};

			dom.components["resizer"] = function resizer() {
				const elm = dom.elm("div");
				elm.classList.add("resizer");
				dom.component(elm, arguments);
				elm.mode = 3;
				elm.onmousedown = dom.start_drag;

				return elm;
			};


			dom.show_dropdown = (function () {

				const drop_container = dom.$.div({ $style: "position:absolute;pointer-events:none" });
				let overlay;
				drop_container.show = function () {
					overlay = dom.get_overlay();
					drop_container.bring_to_front = true;
					dom.add_body(drop_container);
					overlay.show(drop_container, true);
					//overlay.style.opacity = 0.5;

				};
				drop_container.ondismise = function () { };
				drop_container.dismis = function () {
					this.style.display = "none";
					this.ondismise();
				};
				drop_container.hide = function () {
					overlay.dismis();

				};


				drop_container.dismis();
				return function (elm, dropdown, cb) {
					const rect = elm.getBoundingClientRect();
					drop_container.style.left = rect.left + "px";
					drop_container.style.top = (rect.top + 0) + "px";


					dropdown.old_parent = dropdown.parentNode;

					drop_container.appendChild(dropdown);

					drop_container.show();
					drop_container.ondismise = function () {
						if (dropdown) {
							if (dropdown.old_parent) {
								dropdown.old_parent.appendChild(dropdown);
							}
							else {
								drop_container.removeChild(dropdown);
							}


						}
						if (cb) cb();
					};

					drop_container.style.width = Math.max(dropdown.getBoundingClientRect().width, rect.width) + "px";

					return drop_container;

				};

			})();
			function on_drag_elm_start(e) {
				for (let k in e.target.drag_data) {
					e.dataTransfer.setData(k, e.target.drag_data[k]);
				}
			}
			dom.drag_elm_start = function (elm, data) {
				elm.drag_data = data;
				elm.ondragstart = on_drag_elm_start;
			}

			dom.start_drag = (function () {

				let mouse_down_x, mouse_down_y, mouse_down_target, drag_overlay;

				let last_drag_time = 0;
				let start_drag_function_cb, start_drag_function_cb_done;
				const drage_resize = dom.create_event("drage_resize", {});
				const mouse_move = function (e) {
					if (Date.now() - last_drag_time > 15) {
						last_drag_time = Date.now();
						let dx = e.clientX - mouse_down_x;
						let dy = e.clientY - mouse_down_y;
						if (start_drag_function_cb !== undefined) {
							start_drag_function_cb(dx, dy, e);
						}
						else if (mouse_down_target) {
							const tar = mouse_down_target;
							e.preventDefault();

							if (tar.mode) {
								const par = tar.parentNode;
								let rect = par.getBoundingClientRect();
								if (tar.mode === 1) {
									if (parseInt(par.style.width) > 0 || rect.width > 0) {
										dx = dx * (tar.direction == undefined ? 1 : tar.direction);
										if (par.style.width.indexOf("px") > 0) {
											par.style.width = Math.max(1, (parseInt(par.style.width) + (dx))) + "px";
										}
										else {
											par.style.width = Math.max(1, (rect.width + (dx))) + "px";
										}
									}
								}
								else if (tar.mode === 2) {
									if (parseInt(par.style.height) > 0 || rect.height > 0) {
										if (par.style.height.indexOf("px") > 0) {
											par.style.height = Math.max(1, (parseInt(par.style.height) - (dy))) + "px";
										}
										else {
											par.style.height = Math.max(1, (rect.height + (dy))) + "px";
										}
									}
								}
								else if (tar.mode === 3) {
									if (parseInt(par.style.width) > 0 || rect.width > 0) {
										if (par.style.width.indexOf("px") > 0) {
											par.style.width = Math.max(1, (parseInt(par.style.width) + (dx))) + "px";
										}
										else {
											par.style.width = Math.max(1, (rect.width + (dx))) + "px";
										}
									}

									if (parseInt(par.style.height) > 0 || rect.height > 0) {
										if (par.style.height.indexOf("px") > 0) {
											par.style.height = Math.max(1, (parseInt(par.style.height) + (dy))) + "px";
										}
										else {
											par.style.height = Math.max(1, (rect.height + (dy))) + "px";
										}
									}

								}

								else if (tar.mode === 4) {
									if (par.style.left !== undefined) {
										par.style.left = (parseInt(par.style.left) + dx) + "px";
									}

									if (par.style.top !== undefined) {
										par.style.top = (parseInt(par.style.top) + dy) + "px";
									}

								}
								else if (tar.mode === 10) {


									console.log("dx", dx, dy);
									if (dy < 5 || dx < 5) {

										if (par != par.parentNode.firstChild) {
											par.parentNode.insertBefore(par.previousSibling, par);
										}

									}
									else if (dx > 5 || dy > 5) {

										if (par == par.parentNode.lastChild) {
											return;
										}
										if (par.nextSibling) {
											par.parentNode.insertAfter(par.nextSibling, par);
										}
									}
								}


								document.dispatchEvent(drage_resize);
								//if (window.onresize) window.onresize();
							}
							else {
								if (tar.ondrage) {
									if (tar.ondrage(dx, dy, e) === false) {
										mouse_down_x = e.clientX;
										mouse_down_y = e.clientY;
										return;

									}

								}
								if (tar.style.left !== undefined) {
									tar.style.left = (parseInt(tar.style.left) + dx) + "px";
								}

								if (tar.style.top !== undefined) {
									tar.style.top = (parseInt(tar.style.top) + dy) + "px";
								}


							}


						}

						mouse_down_x = e.clientX;
						mouse_down_y = e.clientY;

					}

				}



				function mouse_up(e) {
					last_drag_time = 0;
					drag_overlay.dismis();
					if (mouse_down_target) {
						if (mouse_down_target.drag_opacity) {
							mouse_down_target.style.opacity = 0;
						}
					}
					if (start_drag_function_cb_done) {
						start_drag_function_cb_done(e);
					}
					start_drag_function_cb = undefined;
					start_drag_function_cb_done = undefined;
					mouse_down_target = undefined;
					document.removeEventListener("mousemove", mouse_move);
					document.removeEventListener("mouseup", mouse_up);
				}


				dom.start_drag_function = function (x, y, cb, done_cb, elm) {
					start_drag_function_cb = cb;
					start_drag_function_cb_done = done_cb;
					mouse_down_x = x;
					mouse_down_y = y;
					drag_overlay = dom.get_overlay();
					drag_overlay.show(elm);
					document.addEventListener("mousemove", mouse_move);
					document.addEventListener("mouseup", mouse_up);
				};


				return function (e) {
					mouse_down_x = e.clientX;
					mouse_down_y = e.clientY;
					mouse_down_target = e.target;

					if (mouse_down_target.drag_opacity) {
						mouse_down_target.style.opacity = mouse_down_target.drag_opacity;
					}

					e.stopPropagation();
					e.preventDefault();
					drag_overlay = dom.get_overlay();
					drag_overlay.show(mouse_down_target);
					document.addEventListener("mousemove", mouse_move);
					document.addEventListener("mouseup", mouse_up);

				}


			})();


			dom.$.div.collapseable = function () {
				const d = dom.$.div.apply(dom, arguments);
				d.classList.add("collapseable");
				d.appendChild(dom.$.div({
					$class: "header", onclick: function () {
						
						d.classList.toggle("collapsed");
						if (d.on_collapsed) d.on_collapsed(d.classList.contains("collapsed"))
					}
				}, d.heading || "&nbsp;"));
				d.insert_top = function (e) {
					d.insertBefore(e, d.firstChild);
				};
				d.insert_bottom = function (e) {
					d.insertBefore(e, d.lastChild);
				};
				return d;
			};

			dom.$.div.window = function () {
				const d = dom.$.div.apply(dom, arguments);
				d.classList.add("div_window");
				d.appendChild(dom.$.div({ $class: "div_window_dragger", mode: 4, onmousedown: dom.start_drag, }, d.heading,
					d.collapseable ? dom.$.div({
						$class: "div_window_collapser", onmousedown: function () {
							d.classList.toggle("div_window_collapsed");

						}
					}) : undefined
				));



				if (d.resizeable) {
					d.appendChild(dom.$.resizer());
				}

				return d;
			};


			dom.create_canvas = (function () {

				function create_canvas(w, h, doc) {
					if (!h) h = w;
					doc = doc || document;
					var temp_canvas = doc.createElement('canvas');
					temp_canvas.ctx = temp_canvas.getContext('2d', {});

					temp_canvas.width = w;
					temp_canvas.height = h;
					temp_canvas.set_size = function (ww, hh) {
						this.width = ww;
						this.height = hh;
					};
					temp_canvas.get_image_data = function () {
						return this.ctx.getImageData(0, 0, this.width, this.height);
					};

					temp_canvas._get_image_data = function () {
						this.imd = this.ctx.getImageData(0, 0, this.width, this.height);
						return this.imd;
					};

					temp_canvas.get_image_data_at = function (x, y, w, h) {
						return this.ctx.getImageData(x, y, w, h);
					};

					temp_canvas._put_image_data = function (imd) {
						this.ctx.putImageData(imd || this.imd, 0, 0);
					};

					temp_canvas._put_image_data_at = function (imd, x, y) {
						this.ctx.putImageData(imd, x, y);
					};

					temp_canvas.blob_promise = function (type) {
						return new Promise(function (resolve) {
							temp_canvas.toBlob(resolve, type);
						});
					};






					let sc, mw, mh;



					temp_canvas.draw_image_fit = function (img, ww, hh) {

						sc = this.width / ww;
						mw = ww * sc;
						mh = hh * sc;

						if (mh > this.height) {
							sc = this.height / mh;
							mw = mw * sc;
							mh = mh * sc;
						}

						// this.ctx.fillStyle = "red";
						// this.ctx.fillRect(0, 0, this.width, this.height);

						this.ctx.drawImage(img,
							((this.width * 0.5) - (mw * 0.5)),
							((this.height * 0.5) - (mh * 0.5)),

							mw, mh);



					};

					temp_canvas.draw_image_center_fit = function (img, pad, mw, mh, sca, ox, oy) {

						pad = (pad !== undefined) ? pad : 0;

						mw = mw || img.width;

						mh = mh || img.height;
						sc = (this.height - pad * 4) / (mh);


						sc = sc * (sca || 1);

						mh *= sc;
						mw *= sc;
						ox = ox || 0;
						oy = oy || 0;

						this.ctx.drawImage(img,
							((this.width * 0.5) - (mw * 0.5)) + ox,
							((this.height * 0.5) - (mh * 0.5)) + oy,

							mw, mh);
					}




					return temp_canvas;
				}
				const pool = [];
				create_canvas.get = function (w, h) {
					let c;
					if (pool.length > 0) {
						c = pool.pop();
						c.set_size(w, h)
					}
					else {
						c = create_canvas(w, h);
						c.ctx.imageSmoothingEnabled = false;
					}
					return c;
				}
				create_canvas.free = function (c) {
					pool.push(c);
				};

				dom.empty_canvas = function () {
					const e = dom.elm("canvas");
					e.style.width = "calc(100%)";
					e.style.height = "calc(100%)";
					dom.component(e, arguments);

					return e;
				};
				const each = function (callback, index) {
					const func = function (index) {
						callback(func, index);
					};
					func(index || 0);
				};


				dom.canvas_image_data = (function () {
					const parking = [];
					const canv = create_canvas(1, 1);
					const img = new Image();
					canv.setAttribute("willReadFrequently", true);
					img.crossOrigin = "Anonymous";
					img.is_busy = false;
					function process(url, cb, w, h,image_data) {
						if (img.is_busy) {
							parking.unshift([url, cb, w, h, image_data]);
							return;
						}
						if (Array.isArray(url)) {
						
							const datas = [];
							each(function (next, index) {
								img.onload = function () {
									canv.set_size(w || this.width, h || this.height);
									canv.ctx.drawImage(this, 0, 0, canv.width, canv.height);
									datas.push(canv._get_image_data());
									if (index < url.length - 1) {
										next(index + 1);
									}
									else {
										if (cb) cb(datas);
										this.is_busy = false;
										if (parking.length > 0) {
											process.apply(this, parking.pop());
										}
									}


								};
								img.onerror = function () {
									canv.set_size(w || this.width, h || this.height);

									datas.push(canv._get_image_data());
									if (index < url.length - 1) {
										next(index + 1);
									}
									else {
										if (cb) cb(datas);
										this.is_busy = false;
										if (parking.length > 0) {
											process.apply(this, parking.pop());
										}
									}
								};
								img.is_busy = true;
								img.src = url[index];


							});
						}
						else {
							img.onload = function () {
								if (image_data) {
									canv.set_size(w || this.width, h || this.height);
									canv.ctx.drawImage(this, 0, 0, canv.width, canv.height);
									if (cb) cb(canv._get_image_data().data, canv.width, canv.height, this);
									canv._put_image_data();
								}
								else {
									if (cb) cb(this, this.width, this.height);
                }
					
								this.is_busy = false;
								if (parking.length > 0) {
									process.apply(this, parking.pop());
								}
							};
							img.is_busy = true;
							img.src = url;
						}


					}

					dom.working_image = function (url, cb) {
						return process(url, cb);
					};
					return function (url, cb, w, h) {
						return process(url, cb, w, h, true);
					}





				})();
				
				return create_canvas;
			})();

			dom.download_file = (function () {
				var element = document.createElement('a');
				element.style.display = 'none';
				return function (name, url) {
					element.setAttribute('href', url);
					element.setAttribute('download', name);
					document.body.appendChild(element);
					element.click();
					document.body.removeChild(element);
				}
			})();

			dom.components["treeview"] = function treeview() {
				const t =dom.$.ul({ $class: "treeview" });
				dom.component(t, arguments);
				t.onclick = function (e) {
					if (e.target.classList.contains("folder")) {
						e.target.parentNode.classList.toggle("expanded");
					}
				};
				return t;
			};


			dom.components["treenode"] = function treenode() {
				const d = dom.component(dom.$.div(), arguments);
				const t = dom.$.li(d, d.childNodes.length > 1 ? (d.childNodes[1].tagName.toLowerCase() == "ul" ? d.childNodes[1] : dom.$.ul(d.childNodes.map(function (m, i) {
					if (i > 0) return m;
					return undefined;
				}))) : undefined);

				if (t.childNodes.length > 1) {
					t.firstChild.classList.add("folder");
					t.classList.add("folder-node");
					if (d.expanded) {
						t.classList.add("expanded");
					}
				}





				return t;
			};

			dom.components["treeview"].node = dom.components["treenode"];


			dom.components["pan_div"] = function pan_div() {
				const inner = dom.elm("div");

				const pd = dom.elm("div");
				pd.appendChild(inner);

				pd.inner = inner;

				pd.mouse_down_x = 0;
				pd.mouse_down_y = 0;
				pd.scale_delta = 0.002;
				pd.updated = pd.mouse_move = pd.mouse_down = pd.mouse_up = pd.mouse_tap = pd.mouse_drag = function () { };
				pd.mouse_wheel = function (delta, x, y, e) { };

				//	
				dom.component(pd, arguments);
				dom.component(inner, arguments);
				pd.scale = pd.scale || 1;
				pd.pan_x = 0;
				pd.pan_y = 0;

				pd.mouse_x = 0;
				pd.mouse_y = 0;

				if (!pd.style.position) {
					pd.style.position = "relative";
				}

				pd.style.width = pd.style.width || "100%";
				pd.style.height = pd.style.height || "100%";


				pd.style.overflow = "hidden";


				inner.setAttribute("style", "position:absolute;left:0;top:0;width:0;height:0;posinter-events:fill");


				pd.enable_screen_drage = function () {
					pd.style.pointerEvents = "none";
					inner.onmousedown = function () {
						pd.style.pointerEvents = "fill";
						inner.style.pointerEvents = "none";

					};
					document.addEventListener("mouseup", function () {
						pd.style.pointerEvents = "none";
					});
				};

				inner.onmousedown = function () {
					//pd.style.pointerEvents = "fill";
					//inner.style.pointerEvents = "none";

				};
				inner.style.pointerEvents = "fill";



				pd.update = function () {

					inner.style.left = (pd.pan_x * pd.scale) + "px";
					inner.style.top = (pd.pan_y * pd.scale) + "px";
					inner.style.transform = " scale(" + pd.scale + ")";
					inner.rect = inner.getBoundingClientRect();
					this.rect = this.getBoundingClientRect();
					pd.updated();
				};


				const mouse_wheel = function (e) {
					const delta = (e.detail ? e.detail * -120 : e.wheelDelta) * 0.5;
					const rect = pd.getBoundingClientRect();

					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					e.stopPropagation();
					e.preventDefault();
					if (pd.mouse_wheel(delta, x, y, e) === false) return;

					const last_scale = pd.scale;
					pd.scale = Math.max(pd.scale + delta * (pd.scale_delta * last_scale), 0.15);

					const dx = x / last_scale - x / pd.scale;
					const dy = y / last_scale - y / pd.scale;
					pd.pan_x -= dx;
					pd.pan_y -= dy;
					pd.update();
				};

				pd.reset_view = function () {
					pd.scale = 1;
					pd.pan_x = 0;
					pd.pan_y = 0;
					pd.update();
				};

				pd.scale_view = function (s) {
					pd.scale = s;
					pd.pan_x = 0;
					pd.pan_y = 0;
					pd.update();
				};

				const mouse_up = function (e) {
					pd.mouse_up(e)
					//	pd.style.pointerEvents = "none";
					inner.style.pointerEvents = "fill";

					if (pd.mouse_is_down) {
						pd.mouse_is_tap = true;
						pd.mouse_tap(e)
					}
					pd.update();
					pd.enable_paning = true;
					pd.mouse_is_tap = false;
					pd.mouse_holding_down = false;
				};

				const mouse_down = function (e) {

					//if (e.target !== pd) return pd.update();
					const rect = pd.getBoundingClientRect();
					pd.mouse_down_x = e.clientX - rect.left;
					pd.mouse_down_y = e.clientY - rect.top;

					pd.mouse_x = pd.mouse_down_x / pd.scale - pd.pan_x;
					pd.mouse_y = pd.mouse_down_y / pd.scale - pd.pan_y;
					if (pd.mouse_down(e) === false) return;

					pd.mouse_is_down = true;
					pd.mouse_holding_down = true;
					pd.update();
				};


				const mouse_move = function (e) {
					const rect = pd.getBoundingClientRect();

					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					pd.mouse_rx = x;
					pd.mouse_ry = y;

					pd.mouse_x = x / pd.scale - pd.pan_x;
					pd.mouse_y = y / pd.scale - pd.pan_y;

					if (pd.mouse_move(e) === false) return;

					pd.mouse_is_down = false;
					const dx = (x - pd.mouse_down_x) / pd.scale;
					const dy = (y - pd.mouse_down_y) / pd.scale;
					if (e.buttons !== 0) {
						if ((pd.mouse_holding_down && pd.mouse_drag(dx, dy, e, pd.mouse_down_target) !== false) && (e.target === pd)) {
							pd.pan_x += dx;
							pd.pan_y += dy;
						}

						pd.mouse_down_x = x;
						pd.mouse_down_y = y;
						e.stopPropagation();
					}
					pd.update();
				};

				document.addEventListener("mouseup", function () {
					pd.mouse_holding_down = false;
				});

				pd.addEventListener("mouseup", mouse_up);
				pd.addEventListener("mousedown", mouse_down);
				pd.addEventListener("mousemove", mouse_move);

				pd.addEventListener(/Firefox/i.test(navigator.userAgent) ? "DOMMouseScroll" : "mousewheel", mouse_wheel, false);




				pd.canvas2d = function (cb) {
					const pd = this;
					pd.canv2d = dom.create_canvas(1, 1);
					const on_render = new CustomEvent("on_render", {});
					const on_init = new CustomEvent("on_init", {});
					pd.canv2d.style.width = "100%";
					pd.canv2d.style.height = "100%";
					pd.canv2d.style.position = "absolute";
					pd.canv2d.style.pointerEvents = "none";
					const canv = pd.canv2d;
					const ctx = pd.canv2d.ctx;

					pd.insertBefore(canv, pd.inner);

					canv.render_grid = function (grid_size, grid_color) {
						ctx.lineWidth = 1 / pd.scale;
						const w = canv.width / pd.scale;
						const h = canv.height / pd.scale;

						const xs = -(Math.floor(pd.pan_x / grid_size) + 1) * grid_size;
						const ys = -(Math.floor(pd.pan_y / grid_size) + 1) * grid_size;
						const xe = xs + (w / grid_size + 1) * grid_size;
						const ye = ys + (h / grid_size + 1) * grid_size;


						let x, y;


						ctx.strokeStyle = grid_color;
						ctx.beginPath();
						for (x = xs; x < xe; x += grid_size) {
							ctx.moveTo(x, ys);
							ctx.lineTo(x, ye);
						}

						for (y = ys; y < ye; y += grid_size) {
							ctx.moveTo(xs, y);
							ctx.lineTo(xe, y);
						}


						ctx.stroke();

						ctx.lineWidth = 1;
					};



					canv.grid = function (grid_size, cb) {

						ctx.lineWidth = 1 / pd.scale;
						const w = canv.width / pd.scale;
						const h = canv.height / pd.scale;

						const xs = -(Math.floor(pd.pan_x / grid_size) + 1) * grid_size;
						const ys = -(Math.floor(pd.pan_y / grid_size) + 1) * grid_size;
						const xe = xs + (w / grid_size + 1) * grid_size;
						const ye = ys + (h / grid_size + 1) * grid_size;


						let x, y;
						canv.grid_xs = xs;
						canv.grid_ys = ys;
						canv.grid_xe = xe;
						canv.grid_ye = ye;

						canv.grid_w = (xe - xs);
						canv.grid_h = (ye - ys);

						for (x = xs; x < xe; x += grid_size) {

							for (y = ys; y < ye; y += grid_size) {
								cb(x, y, xs, ys, xe, ye);
							}
						}

						ctx.lineWidth = 1;
					};


					canv.on_render = function () {

					};

					canv.on_background_render = function () {

					};
					canv.on_foreground_render = function () {

					};




					pd.updated = function () {
						pd.rect = canv.getBoundingClientRect();

						width = pd.rect.right - pd.rect.left;
						height = pd.rect.bottom - pd.rect.top;

						if (width !== canv.width || height !== canv.height) {
							canv.width = width;
							canv.height = height;
							if (pd.pan_to_fixed) {
								pd.pan_x = canv.width * pd.pan_to_fixed[0];
								pd.pan_y = canv.height * pd.pan_to_fixed[1];

								pd.pan_x -= (pd.pan_x - (pd.pan_x / pd.scale));
								pd.pan_y -= (pd.pan_y - (pd.pan_y / pd.scale));

							}
						}

						ctx.clearRect(0, 0, canv.width, canv.height);
						ctx.canvas_scale = pd.scale;
						canv.on_background_render(ctx);
						ctx.save();
						ctx.scale(pd.scale, pd.scale);
						ctx.translate(pd.pan_x, pd.pan_y);
						if (canv.on_render(ctx) !== false) {
							pd.dispatchEvent(on_render);
						}

						ctx.restore();
						canv.on_foreground_render(ctx);
					};


					if (cb) cb(canv);
					pd.dispatchEvent(on_init);
					return canv;

				}

				pd.canvas2d_edit_points = function (cb) {
					const pd = this;
					const value = pd.value;

					return pd.canvas2d(function (canv) {

						canv.points = [];
						dom.def_props(pd, {
							value: [
								function (value) {
									canv.points = value;
								},
								function () {
									return canv.points;
								}
							],
						});

						if (value) pd.value = value;


						function check_mouse_point(x, y, rad) {
							return (Math.pow(x - pd.mouse_x, 2) + Math.pow(y - pd.mouse_y, 2)) < (rad * rad);
						}

						pd.point_title = function (p) {
							return p[0].toFixed(2) + " , " + p[1].toFixed(2);
						};


						canv.edit_points = function (ctx) {
							let w = (1 / pd.scale) * 4;
							canv.points.forEach(function (p) {
								ctx.fillStyle = "rgba(0,255,0,0.5)";
								ctx.fillRect(p[0] - w, p[1] - w, w * 2, w * 2);
							});
							const p = canv.active_point;
							if (p) {
								ctx.fillStyle = "white";
								ctx.font = (Math.max(0.025, (1 / pd.scale)) * 4) + "px arial";
								ctx.fillText(pd.point_title(p), p[0], p[1] - ((1 / pd.scale) * 10));
								w *= 1.2;
								ctx.fillStyle = "rgba(255,0,0,0.5)";
								ctx.fillRect(p[0] - w, p[1] - w, w * 2, w * 2);
							}
						}
						pd.mouse_down = function (e) {

							if (e.buttons == 1) {

								canv.active_point = null;
								let w = (1 / pd.scale) * 4;
								canv.points.forEach(function (p) {
									if (check_mouse_point(p[0], p[1], w * 2)) {
										canv.active_point = p;
									}
								});
							};

						}
						pd.mouse_drag = function (dx, dy, e, mouse_down_target) {

							if (canv.active_point) {
								if (pd.edit_points) {
									if (pd.edit_points(canv.active_point, dx, dy) === false) {
										return false;
									}
								}
								canv.active_point[0] += dx;
								canv.active_point[1] += dy;


								return false;
							}

						};

						if (cb) cb(canv);

					});
				}
				return pd;
			};

			dom.components["node_canvas"] = function node_canvas() {

				const nd = dom.components["pan_div"]({ class$: "node_canvas" });


				dom.component(nd, arguments);
				const update_canvas = new CustomEvent("update_canvas", {});
				nd.add_background = function (elm, elb) {
					this.insertBefore(elm, elb || this.inner);

				};

				let draging_node,mousedown_node;

				nd.update_canvas = function () {
					nd.dispatchEvent(update_canvas);
				};

				nd.drag_node = function (node, dx, dy) {
					if (node.style.left !== undefined) {
						node.style.left = (parseFloat(node.style.left) + dx) + "px";
					}

					if (node.style.top !== undefined) {
						node.style.top = (parseFloat(node.style.top) + dy) + "px";
					}
				}


				function drag_node(dx, dy) {
					nd.drag_node(draging_node, (dx / nd.scale), (dy / nd.scale));
					nd.update_canvas();
				};

				nd.mouse_down = function (e) {

					

					if (e.target.classList.contains("node")) {
						mousedown_node = e.target;
						draging_node = null;
						return false;
						draging_node = e.target;

						if (!draging_node.prevent_bring_to_front) {
							draging_node.parentNode.appendChild(draging_node);
						}

						dom.start_drag_function(e.clientX, e.clientY, drag_node);
						e.preventDefault();
						return false;
					}



				};


				nd.mouse_wheel = function (delta, x, y, e) {
					nd.update_canvas();
				};

				nd.mouse_move = function (e) {
					if (e.buttons > 0) {

						if (e.target.classList.contains("node")) {
							if (draging_node !== e.target && mousedown_node == e.target) {
								draging_node = e.target;
								if (!draging_node.prevent_bring_to_front) {
									draging_node.parentNode.appendChild(draging_node);
								}

								dom.start_drag_function(e.clientX, e.clientY, drag_node);
								e.preventDefault();
								return false;
							}
						}

						nd.update_canvas();
					}
				};

				nd.create_node = function () {
					const nod =dom.$.div({ class$: "node" });
					nod.style.left = "0px";
					nod.style.top = "0px";
					dom.component(nod, arguments);


					this.inner.appendChild(nod);

					return nod;
				};

				if (nd.ready) {
					nd.ready(nd);
				}

				return nd;
			};


			return dom;

		});

	});

	packing.register("dom.color_input", function () {
		packing("dom", "define")("dom.color_input", function (dom, define) {
			dom.css(`
        .input_slide {
          position:relative;
          background-color:rgba(100,100,100,0.5);
          overflow:hidden;
          margin-bottom:10px;
        }

        .input_slide > input {
          border:none;
          background:none;
          color:silver;
           cursor: e-resize;
           padding:5px;
        }

        .input_slide > span {
          position:absolute;
          left:0;top:0;bottom:0;
          pointer-events:none;
          background-color:rgba(100,100,100,0.5);
        }
.value_slider{
width:100%;
}

        `);


			const _divinput = dom.create_event("input", { bubbles: true });

			const value_slider = dom.components["value_slider"] = function value_slider() {

				const _div = dom.elm("div");
				_div.classList.add("value_slider");
				const _slider = dom.elm("input");
				_slider.setAttribute("type", "range");
				const _input = dom.elm("input");
				_input.setAttribute("type", "text");

				dom.def_props(_div, {
					value: [
						function (value) {
							value = parseFloat(value);
							_input.value = value;
							_slider.value = value;
							_div._value = value;
						},
						function () {
							return parseFloat(_div._value);
						}
					],
					min: [
						function (value) {
							_slider.min = value;
						},
						function () {
							return _slider.min;
						}
					],
					max: [
						function (value) {
							_slider.max = value;
						},
						function () {
							return _slider.max;
						}
					],
					step: [
						function (value) {
							_slider.step = value;
						},
						function () {
							return _slider.step;
						}
					]
				});
				dom.component(_div, arguments);
				_div.style.display = _div.style.display || "inline-block";






				_slider.style.width = "calc(80% - 4px)";
				_slider.style.margin = "0";
				_slider.style.float = "left";

				_input.style.float = "left";
				_input.style.width = "calc(20% - 2px)";
				_input.style.margin = "0";
				_input.style.padding = "0";

				//_slider.setAttribute("style", "position:absolute;left:0;top:0;border:solid 1px red");
				_input.value = _slider.value;
				_div._value = _input.value;

				_slider.oninput = function (e) {
					e.preventDefault();
					e.stopPropagation();
					_input.value = _slider.value;
					_div._value = _input.value;
					//if (_div.oninput) _div.oninput(_slider.value);
					_div.dispatchEvent(_divinput);

					return false;
				};

				_input.oninput = function (e) {
					e.preventDefault();
					e.stopPropagation();
					_slider.value = _input.value;

					_div._value = _input.value;
					//if (_div.oninput) _div.oninput(_slider.value);
					_div.dispatchEvent(_divinput);

					return false;
				};

				_input.value = _slider.value;
				_div.appendChild(_slider);
				_div.appendChild(_input);
				return _div;
			};

			dom.components["input_slide"] = (function () {
				let sinput, inc_value;
				function _slide_input(dx, dy) {
					sinput.value = parseFloat(sinput.value) + ((dx * 0.5) * inc_value);
					sinput.parentNode.set_value(parseFloat(sinput.value).toFixed(sinput.parentNode.decimals));

					sinput.parentNode.dispatchEvent(_divinput);
				}
				function _slide_input_end() {

				}
				function input_slide() {
					//	const _divinput = dom.create_event("input", { bubbles: true });
					const _div = dom.component(dom.elm("div"), arguments);

					_div.classList.add("input_slide");

					const _input = dom.elm("input");

					_input.setAttribute("type", "text");
					_input.style.border = "none";



					dom.def_props(_div, {
						value: [
							function (value) {
								_div.set_value(value);
							},
							function () {
								if (_div.mode == "text") return _input.value;

								return _div.format_value();
							}
						],
					});


					_input.oninput = function (e) {
						e.preventDefault();
						e.stopPropagation();
						//_div.set_value(this.value);
						_div.dispatchEvent(_divinput);
						return false;
					};

					_input.onblur = function (e) {
						e.preventDefault();
						e.stopPropagation();
						_div.set_value(this.value);
						//	_div.dispatchEvent(_divinput);
						return false;
					};

					_div.appendChild(_input);

					_input.setAttribute("autofocus", "autofocus");
					_input.setAttribute("onfocus", "this.select()");

					if (_div.decimals == undefined) _div.decimals = input_slide.decimals;
					_div.format_value = function () {
						//_input.value = parseFloat(_input.value).toFixed(_div.decimals);
						let value = parseFloat(_input.value)
						if (_div.max !== undefined) {
							value = Math.min(value, _div.max);
						}

						if (_div.min !== undefined) {
							value = Math.max(value, _div.min);
						}

						return sinput ? value.toFixed(sinput.parentNode.decimals) : value.toFixed(5);
					};

					_div.set_value = function (value) {
						if (_div.mode == "text") {
							_input.value = value;
							return;
						}
						if (value == "-") return;


						value = parseFloat("" + value);


						if (_div.max !== undefined) {
							value = Math.min(value, _div.max);
						}

						if (_div.min !== undefined) {
							value = Math.max(value, _div.min);
						}

						if (isNaN(value)) {

							value = 0;
						}
						_input.value = value.toFixed(_div.decimals);

						//if (_div.decimals == 0) _input.value = parseInt(value); else


					};


					_input.onmousedown = function (e) {
						if (_div.mode == "text") return;
						sinput = this;
						if (_div.inc !== undefined) {
							inc_value = _div.inc;
						}
						else {
							inc_value = parseFloat(this.value);
							inc_value = Math.max(0.01, inc_value * 0.01);
						}
						dom.start_drag_function(e.clientX, e.clientY, _slide_input, _slide_input_end, sinput);
					};

					_div._input = _input;

					return _div;
				};
				input_slide.decimals = 0;
				return input_slide;
			})();

			dom.components["color_input"] = (function () {
				const _colorinput = dom.create_event("input", { bubbles: true });
				const canv =dom.$.canvas({ width: 128, height: 128, float$: "left", width$: "128px", height$: "128px" });
				const cinput = dom.$.div(
					{ position$: "absolute", backgroundColor$: "gray", border$: "solid 1px silver" },
					canv,
					dom.$.div({ width$: "128px", float$: "left" },
						value_slider({ max: 255, value: 0 }),
						value_slider({ max: 255, value: 0 }),
						value_slider({ max: 255, value: 0 }),
						value_slider({ max: 255, value: 0, display$: "none" }),

					)
				);

				const ctx = canv.getContext("2d");
				const gradient = ctx.createLinearGradient(0, 0, canv.width, 0);
				gradient.addColorStop(0, "rgb(255,   0,   0)");
				gradient.addColorStop(0.15, "rgb(255,   0, 255)");
				gradient.addColorStop(0.33, "rgb(0,     0, 255)");
				gradient.addColorStop(0.49, "rgb(0,   255, 255)");
				gradient.addColorStop(0.67, "rgb(0,   255,   0)");
				gradient.addColorStop(0.84, "rgb(255, 255,   0)");
				gradient.addColorStop(1, "rgb(255,   0,   0)");
				ctx.fillStyle = gradient;
				ctx.fillRect(0, 0, canv.width, canv.height);
				canv.multiplier = 1;



				const ranges = [];
				function update_color_value(spa, value, multiplier) {
					multiplier = multiplier || 1;
					spa.style.backgroundColor = "rgba("
						+ Math.floor((value[0] * multiplier)) + ","
						+ Math.floor((value[1] * multiplier)) + ","
						+ Math.floor((value[2] * multiplier)) + ","
						+ value[3] + ")";




					 //console.log("update_color_value", [spa, value, spa.style.backgroundColor]);
					spa._value = value;

				};

				canv.onmousemove = canv.onmousedown = function (e) {
					if (e.buttons === 1) {
						const rect = canv.getBoundingClientRect();
						const x = (e.clientX - rect.left) | 0;
						const y = (e.clientY - rect.top) | 0;
						if (x > -1 && y > -1) {
							const rgba = ctx.getImageData(x, y, 1, 1).data;
							ranges[0].value = rgba[0];
							ranges[1].value = rgba[1];
							ranges[2].value = rgba[2];
							//ranges[0].oninput();
							//ranges[1].oninput();
							// ranges[2].oninput();
							canv.spa._value[0] = rgba[0] / canv.multiplier;
							canv.spa._value[1] = rgba[1] / canv.multiplier;
							canv.spa._value[2] = rgba[2] / canv.multiplier;

							update_color_value(canv.spa, canv.spa._value, canv.multiplier);
							canv.spa.dispatchEvent(_colorinput);

						}

					}
				};
				canv.update_value = function () {

				};
				cinput.querySelectorAll(".value_slider").forEach(function (r, i) {

					r.index = i;
					r.oninput = function (e) {
						if (this.index > 2)
							canv.spa._value[this.index] = this.value / 255;
						else
							canv.spa._value[this.index] = this.value / canv.multiplier;

						update_color_value(canv.spa, canv.spa._value, canv.multiplier);
						e.preventDefault();
						e.stopPropagation();
						canv.spa.dispatchEvent(_colorinput);
						return false;
					};
					ranges.push(r);

				});


				cinput.dismis = function () {
					this.style.display = "none";
					if (canv.spa) {
						if (canv.spa.ondismis) canv.spa.ondismis();
					}
				};

				cinput.bring_to_front = true;
				function show_selector(spa, multiplier) {

					canv.multiplier = multiplier || 1;

					console.log("canv.multiplier", canv.multiplier, spa.value);
					const rec = spa.getBoundingClientRect();
					dom.add_body(cinput);
					cinput.style.left = rec.left + "px";
					cinput.style.top = (rec.top + rec.height) + "px";


					const overlay = dom.get_overlay();

					overlay.show(cinput, true);




					ranges[0].value = (spa._value[0] * canv.multiplier) | 0;
					ranges[1].value = (spa._value[1] * canv.multiplier) | 0;
					ranges[2].value = (spa._value[2] * canv.multiplier) | 0;
					ranges[3].value = (spa._value[3] * 255) | 0;

					canv.backup[0] = ranges[0].value;
					canv.backup[1] = ranges[1].value;
					canv.backup[2] = ranges[2].value;
					canv.backup[3] = ranges[3].value;


					canv.spa = spa;
					//ranges[0].oninput();
					//ranges[1].oninput();
					//ranges[2].oninput();
					//ranges[3].oninput();

					return this;
				}

				canv.backup = [];

				const color_input = function () {
					const spa = dom.$.span({ $class: "color_input", width$: "100%", height$: "20px", display$: "block" });
				
					
					dom.def_props(spa, {
						value: [
							function set(value) {
								spa._value = value;
								update_color_value(spa, spa._value, spa.multiplier);

							},
							function get() {
								return spa._value;
							}

						]

					});

					dom.component(spa, arguments);

					spa._value = spa._value || new Float32Array([255, 255, 255, 255]);

					spa.multiplier = spa.multiplier || 1;

					spa.onmousedown = function (e) {
						show_selector(this, this.multiplier);
					};
					spa.show_selector = function () {
						show_selector(this, this.multiplier);
					};
					spa.update_color_value = update_color_value;
					return spa;
				}
				color_input.show_selector = show_selector;
				return color_input;
			})();

			dom.components["json_editor"] = (function () {
				dom.css(`
.json_editor_input  {position:absolute;font-size:14px;block-size:16px;margin-left:-4px;margin-top:-4px;margin:0;margin-left:-2px;background-color:gray;z-index:99999}
.json_editor_input > input {outline:0;   padding: 0px;padding-left:2px;color:black;}
.json_editor {display:block;margin-left:2px;overflow-x:hidden;pointer-events:fill;}
.json_editor .li{position:relative;margin:2px;width:100%;height:auto;cursor:pointer;}
.json_editor .li >.div {display:inline-block;user-select:none;padding-left:16px;border:solid 1px transparent;min-height:20px;padding-right:4px;}

.json_editor .li >.folder{margin-left:4px;}
.json_editor .li >.div.folder:hover {border:solid 1px gray;background:rgba(100,100,100,0.5);}
.json_editor .li >.folder::before{content:'+';position:absolute;left:10px;}
.json_editor .li.expanded2 >.div.folder.array:hover {padding-right:10px;}
.json_editor .li.disabled{background-color:gray !important;color:silver !important;}

.json_editor .li.expanded > .folder::before{content:'-';}
.json_editor .li >.ul {display: none !important;pointer-events:fill;margin-left:4px;padding:2px;}
.json_editor .li.expanded >.ul {display:inline-table !important;width:100%;}
.json_editor .li.expanded >.ul.array {border-top:solid 1px rgba(0,100,0,0.5);;}

.json_editor .li > .div.label{position:relative;border-bottom:solid 1px rgba(100,100,100,0.5);display:block;pointer-events:none;overflow:hidden;}
.json_editor .li > .div.label >.span{position:absolute;left:50%;width:auto;top:2px;min-width:100px;font-size:14px;block-size:16px;pointer-events:fill;}
`)

				const is_object = define.is_object;
				const is_function = define.is_function;

				const editor_input = dom.components["input_slide"]({ class$: "json_editor_input" });
				const checkbox_input = dom.$.checkbox({ $style: "position:absolute;margin-left:-4px;margin-top:-2px;z-index:999999;" });
				const select_input = dom.$.select({ $style: "position:absolute;margin-left:-4px;margin-top:0px;z-index:999999;" });
				const color_input = dom.$.color_input({
					position$: "absolute", width$: "24px", multiplier: 255,
					opacity$: 0,
					oninput: function () {
						this.fol.textContent = this._value;
						this.fol.style.backgroundColor = this.style.backgroundColor;
					}

				});


				color_input.component = function (editor, fol, key, prop, value) {
					fol.textContent = fol.prop;
					fol.classList.add("label");
					fol = create_div("span", value, fol);
					color_input.update_color_value(fol, value, 255);
					fol.onmousedown = function () {
						const rec = this.getBoundingClientRect();
						color_input.style.display = "unset";

						dom.add_body(color_input);
						color_input.style.left = (rec.left - 32) + "px";
						color_input.style.top = (rec.top + rec.height - 20) + "px";
						color_input.value = value;
						color_input.fol = fol;
						color_input.show_selector();
						fol.style.backgroundColor = color_input.style.backgroundColor;
						color_input.oninput = function () {
							this.fol.textContent = this._value;
							this.fol.style.backgroundColor = this.style.backgroundColor;
							editor.trigger_update(key, prop, this._value);
						}

					}
				};


				const action_button = dom.$.button("x", { $style: "position:absolute;padding: 0px 5px 1px 3px;font-size:70%;display:none;z-index:999999;" });

				dom.add_body(action_button);
				editor_input.last_elm = undefined;
				editor_input.update_elm = function (elm, value, display_value) {

					elm.obj_value = value;
					elm.textContent = display_value;
					const fol = elm.parentNode;
					const cont = fol.parentNode.parentNode;
					const edt = (cont.editor ? cont.editor : cont);
					const obj = edt.find_object(cont.key)

					if (obj) {
						//	console.log("obj", obj, [fol,elm]);
						obj[fol.prop] = elm.obj_value;
					}
					edt.trigger_update(cont.key, fol.prop, elm.obj_value);
				};

				checkbox_input.oninput = function (e) {

					if (this.elm) {
						editor_input.update_elm(this.elm, this.checked, this.checked);
					}
					return false;
				};

				select_input.oninput = function (e) {

					if (this.elm) {
						editor_input.update_elm(this.elm, this.value, this.value);
						editor_input.hide();
					}
					return false;
				};


				editor_input.show = function (elm, sch) {
					this.mode = sch.mode;
					if (sch.mode == "number") {
						this.inc = sch.inc;
						this.decimals = sch.decimals || 0;
						this.min = sch.min;
						this.max = sch.max;
					}
					else if (sch.mode == "select") {
						if (sch.options) {
							if (!sch._options) {
								sch._options = sch.options.map(function (op) {
									if (Array.isArray(op)) {
										return new Option(op[0], op[1]);
									}
									return new Option(op, op);

								});
							}

							if (sch._options) {
								select_input.options.length = 0;
								sch._options.forEach(function (op) {
									select_input.options.add(op);
								})
							}





						}


					}

					const rec = elm.getBoundingClientRect();
					let e = this;
					if (this.mode == "checkbox") {
						e = checkbox_input;
						e.checked = elm.obj_value;
					}
					else if (this.mode == "select") {
						e = select_input;

						e.value = elm.obj_value;
					}
					else {
						e.value = elm.textContent;
					}
					editor_input.last_input = e;
					e.style.display = "block";
					e.style.left = rec.left + "px";
					e.style.top = rec.top + "px";
					e.style.height = rec.height + "px";
					e.style.width = rec.width + "px";
					e.title =sch.title || sch.mode;
					e.elm = elm;

					dom.add_body(e);
				};

				editor_input.hide = function () {
					this.style.display = "none";
					action_button.style.display = "none";
					checkbox_input.style.display = "none";
					select_input.style.display = "none";

					if (this.last_input) {
						//editor_input.update_elm(this.last_input.elm, this.last_input.value, this.last_input.value);
					}
				};

				editor_input.oninput = function (e) {
					if (this.elm) {
						if (this.mode == "text") {
							editor_input.update_elm(this.elm, this.value, this.value);
						}
						else {
							editor_input.update_elm(this.elm, parseFloat(this.value), this.value);
						}

					}
					return false;
				};

				editor_input._input.onblur = function (e) {
					e.preventDefault();
					e.stopPropagation();
					editor_input.hide();
					return false;
				};

				const free_divs = [];
				const divs_holder = dom.elm("div");
				console.log([divs_holder, free_divs]);

				action_button.show_left = function (title, elm, onclick) {
					const btn = this;
					btn.innerHTML = title;
					const rec = elm.getBoundingClientRect();
					btn.style.display = "block";
					btn.style.left = (rec.left) + "px";
					btn.style.top = rec.top + "px";

					btn.style.marginLeft = (-(this.getBoundingClientRect().width * 0.5)) + "px";
					btn.elm = elm;


					btn.onclick = function (e) {
						btn.onclick = undefined;
						btn.style.display = "none";

						e.stopPropagation();
						e.preventDefault();
						onclick(btn);
						return false;
					};
				};

				action_button.show_right = function (title, elm, onclick) {
					const btn = this;
					btn.innerHTML = title;
					const rec = elm.getBoundingClientRect();
					btn.style.display = "block";
					btn.style.left = (rec.right) + "px";
					btn.style.top = (rec.top + 2) + "px";
					btn.style.marginLeft = "0";
					btn.elm = elm;

					btn.onclick = function (e) {
						btn.onclick = undefined;
						btn.style.display = "none";
						e.stopPropagation();
						e.preventDefault();
						onclick(btn);
						return false;

					};
				};

				function create_div(className, text, par) {
					let dv;
					if (free_divs.length > 0) {
						dv = free_divs.pop();
						dv.innerHTML = "";
					}
					else {
						dv = dom.elm("div");
					}
					dv.className = className;

					if (text !== undefined) dv.textContent = text;
					if (par) par.appendChild(dv);
					return dv;
				}

				const jeinput = dom.create_event("input", { bubbles: true });
				function editor() {
					const dv = create_div("json_editor");
					dv.free_div = function (d) {
						if (d) {
							if (d.classList.contains("json_editor_component")) return;
							delete this.objects_loaded[d.key];
							if (d.parentNode !== divs_holder) {
								free_divs.push(d);
								divs_holder.appendChild(d);
								delete d.key;
								delete d.prop;
								delete d.style.backgroundColor;
								if (d.props) {
									delete d.editor;
									delete d.props;
								}
							}

						}

					};
					const params = {};
					dv.on_update = dom.create_event("on_update", params);
					dv.on_update.params = {};
					dv.trigger_update = function (key, prop, value) {

						this.on_update.params.key = key;
						this.on_update.params.prop = prop;
						this.on_update.params.value = value;
						this.dispatchEvent(this.on_update);
						this.dispatchEvent(jeinput);
					};

					dv.create_div = create_div;
					dv.get_schema = function (key, value) {

						for (let i = 0; i < this.schema.length; i++) {
							if (this.schema[i][0].test(key)) return this.schema[i][1];
						}

						if (isNaN(value)) {
							if (value === true || value === false) {
								return "boolean";
							}

							return "text";
						}
						if (value === true || value === false) {
							return "boolean";
						}
						return "number";

					};

					dv.populate_value = function (key, value, parent, json_object) {

						const li = create_div("li", undefined, parent);
						let fol = create_div("div", key + "", li);

						fol.prop = key;
						li.prop = key;
						key = parent.key + '!!' + key;


						fol.key = key;

						if (ArrayBuffer.isView(value) || Array.isArray(value) || is_object(value)) {
							const comp = this.schema.defs[this.get_schema(key, value)];
							if (comp && is_function(comp)) {
								fol.classList.add("component");
								comp(this, fol, key, fol.prop, value);


							}
							else {
								fol.classList.add("folder");
								if (this.expand_all) {
									this.expand_folder(fol);
									fol.parentNode.classList.add("expanded");
								}

							}
						}
						else {
							fol.classList.add("label");

							fol = create_div("span", value, fol);
							fol.schema = this.get_schema(key, value);
							fol.obj_value = value;
						}

					}

					dv.find_object = function (key) {

						let obj = this.json;
						if (key == "___root") return obj;
						const keys = key.split("!!");
						for (let i = 1; i < keys.length; i++) {
							if (!obj) return obj;
							if (Array.isArray(obj)) {

								obj = obj[parseInt(keys[i])];
							}
							else obj = obj[keys[i]];
						}


						return obj;
					}

					dv.expand_value = function (value, parent, json_object) {
						const dv = this;
						if (ArrayBuffer.isView(value) || Array.isArray(value)) {
							parent.classList.add("array");
							value.forEach(function (value, i) {
								dv.populate_value(i, value, parent, json_object);
							});
						}
						else if (is_object(value)) {
							parent.props = parent.props || {};
							for (let k in value) {
								if (is_function(value[k])) continue;
								parent.props[k] = k;
						
								dv.populate_value(k, value[k], parent, json_object);
							}
						}
					};



					const removeables = [];
					dv.observe_values = function observe_values() {
						const dv = this;
						let i, obj, fol, ke, va, sch, ovalue;
						removeables.length = 0;

						for (ke in dv.objects_loaded) {
							ul = dv.objects_loaded[ke];
							obj = dv.find_object(ul.key);
							if (obj) {

								if (ArrayBuffer.isView(obj) || Array.isArray(obj)) {
									if (obj.length != ul.childNodes.length) {
										if (obj.length > ul.childNodes.length) {
											dv.populate_value(obj.length - 1, obj[obj.length - 1], ul, obj);
										}
										else {
											for (i = 0; i < ul.childNodes.length; i++) {
												removeables.push(ul.childNodes[i]);
											}
											for (i = 0; i < obj.length; i++) {
												dv.populate_value(i, obj[i], ul, obj);
											}
										}

									}
									else {
										for (i = 0; i < ul.childNodes.length; i++) {
											fol = ul.childNodes[i].firstChild;
											if (fol.classList.contains("label")) {
												sch = dv.schema.defs[fol.firstElementChild.schema];
												if (sch && sch.mode == "number") {
													va = parseFloat(obj[fol.prop]).toFixed(sch.decimals);
													va = Math.max(sch.min, va);
													va = Math.min(sch.max, va);
													fol.firstElementChild.textContent = va;

												}
												else fol.firstElementChild.textContent = obj[fol.prop];
												//console.log("fol.firstElementChild", [fol.firstElementChild]);
											}
										}
									}



								}
								else {

									for (i = 0; i < ul.childNodes.length; i++) {
										fol = ul.childNodes[i].firstChild;
										ovalue = obj[fol.prop];
										if (ovalue === undefined) {
											removeables.push(fol.parentNode);
										}
										else if (fol.classList.contains("label")) {
											if (fol.firstElementChild.obj_value !== ovalue) {
												fol.firstElementChild.obj_value = ovalue;
												fol.firstElementChild.textContent = fol.firstElementChild.obj_value;
											}
										}
									}
									for (i in obj) {
										if (is_function(obj[i])) continue;
										if (ul.props[i] === undefined) {
											dv.populate_value(i, obj[i], ul, obj);
										}
									}
								}
							}
							else removeables.push(ul.parentNode);
						}

						if (removeables.length > 0) {
							removeables.forEach(function (d) {
								d.querySelectorAll("div").forEach(function (d) {
									dv.free_div(d);
								});
								dv.free_div(d);
							});
						}
						window.PR.free_divs = dv.free_divs.length;

					};

					dv.expand_folder = function (folder) {
						if (!this.objects_loaded[folder.key + ""]) {

							const ul = create_div("ul");
							this.objects_loaded[folder.key + ""] = ul;
							ul.key = folder.key;
							ul.editor = this;
							folder.parentNode.appendChild(ul);
							const obj = this.find_object(ul.key);
							this.expand_value(obj, ul, obj);
						}

					}
					dv.onclick = function (e) {
						if (e.target.classList.contains("folder")) {
							this.expand_folder(e.target);
							e.target.parentNode.parentNode.querySelectorAll(".expanded").forEach(function (b) {
								//	b.classList.remove("expanded");
							});

							e.target.parentNode.classList.toggle("expanded");
						}
					};

					dv.delete_from_array = function (btn) {

						const idx = parseInt(btn.elm.prop);
						const ul = btn.elm.parentNode;
						const arr = dv.find_object(ul.key);
						if (dv.deleting_from_array && dv.deleting_from_array(ul.key, arr, idx) == false) return;
						btn.elm.classList.add("disabled");
						arr.splice(idx, 1);
					};

					dv.add_to_array = function (btn) {
						console.log([btn, btn.elm]);

						const ul = btn.elm.nextSibling;
						const arr = dv.find_object(ul.key);
						console.log([ul.key, arr]);
						if (dv.adding_to_array) dv.adding_to_array(ul.key, arr);
					};

					dv.onmousemove = function (e) {

						if (e.target.classList.contains("span")) {

							if (this.mouse_span !== e.target) {

								this.mouse_span = e.target;
								if (this.mouse_span.schema) {

									if (dv.schema.defs[this.mouse_span.schema]) {

										editor_input.show(e.target, dv.schema.defs[this.mouse_span.schema]);
									}
								}
							}

						}
						else {
							if (e.target.classList.contains("folder")) {
								if (e.target.parentNode.classList.contains("expanded")) {
									if (e.target.nextSibling.classList.contains("array")) {
										action_button.show_right("+ADD", e.target, dv.add_to_array);
										return;
									}

								}
							}
							else if (e.target.classList.contains("li")) {
								if (e.target.parentNode.classList.contains("array")) {
									//	action_button.show_left("X", e.target, dv.delete_from_array);
									return;
								}
							}

							editor_input.hide();
							this.mouse_span = undefined;

						}
					};


					dv.free_divs = free_divs;

					dv.set_json = function (json) {
						const dv = this;
						this.json = json;
						//console.log("json", json);
						this.key = "___root";
						this.objects_loaded = { "___root": dv };
						this.querySelectorAll("div").forEach(function (d) {
							dv.free_div(d);
						});
						this.expand_value(json, dv, json);
					};



					dv.schema = editor.default_schema;


					dom.component(dv, arguments);
					const value = dv.value;
					dom.def_props(dv, {
						value: [
							function (value) {
								dv.set_json(value);
							},
							function () {
								return dv.json;
							}
						],
					});

					//dv.set_json(value);
					console.log("dv", [dv]);
					return dv;
				}

				editor.tick = function () {
					document.querySelectorAll("div.json_editor").forEach(function (dv) {
						dv.observe_values();
					});
					setTimeout(editor.tick, 1000);
				};

				editor.tick();

				editor.create_schema = function (schemas) {
					const sch = [];
					sch.defs = {};
					if (editor.default_schema) {
						Object.assign(sch.defs, editor.default_schema.defs);
					}
					schemas.forEach(function (s) {
						if (s[0] instanceof RegExp) {
							if (!define.is_object(s[1])) {
								sch.push([s[0], s[1]])
							}
							else {
								let id = "schema" + Object.keys(sch.defs).length;
								sch.defs[id] = s[1];
								sch.push([s[0], id]);
							}

						}
						else {
							sch.defs[s[0]] = s[1];
						}
					});

					console.log("create_schema", sch);
					return sch;
				}



				editor.default_schema = editor.create_schema([
					["number", { min: -Infinity, max: Infinity, decimals: 5, inc: 0.01, mode: "number" }],
					["iangle", { mode: "number", min: -180, max: 180, inc: 1, decimals: 0 }],
					["angle", { mode: "number", min: -Math.PI, max: Math.PI, inc: Math.PI / 360, decimals: 4 }],
					["text", { mode: "text" }],
					["boolean", { mode: "checkbox" }],
					["color", color_input.component],
					[/\i@.*/, "iangle"],
					[/@.*/, "angle"],


				]);

				return editor;

			})();



		});

	});

	packing.register("zip", function () {
		packing()("zip", function () {


			const UZIP = this;
			UZIP["parse"] = function (buf, onlyNames)	// ArrayBuffer
			{
				var rUs = UZIP.bin.readUshort, rUi = UZIP.bin.readUint, o = 0, out = {};
				var data = new Uint8Array(buf);
				var eocd = data.length - 4;

				while (rUi(data, eocd) != 0x06054b50) eocd--;

				var o = eocd;
				o += 4;	// sign  = 0x06054b50
				o += 4;  // disks = 0;
				var cnu = rUs(data, o); o += 2;
				var cnt = rUs(data, o); o += 2;

				var csize = rUi(data, o); o += 4;
				var coffs = rUi(data, o); o += 4;

				o = coffs;
				for (var i = 0; i < cnu; i++) {
					var sign = rUi(data, o); o += 4;
					o += 4;  // versions;
					o += 4;  // flag + compr
					o += 4;  // time

					var crc32 = rUi(data, o); o += 4;
					var csize = rUi(data, o); o += 4;
					var usize = rUi(data, o); o += 4;

					var nl = rUs(data, o), el = rUs(data, o + 2), cl = rUs(data, o + 4); o += 6;  // name, extra, comment
					o += 8;  // disk, attribs

					var roff = rUi(data, o); o += 4;
					o += nl + el + cl;

					UZIP._readLocal(data, roff, out, csize, usize, onlyNames);
				}
				//console.log(out);
				return out;
			}


			UZIP._readLocal = function (data, o, out, csize, usize, onlyNames) {
				var rUs = UZIP.bin.readUshort, rUi = UZIP.bin.readUint;
				var sign = rUi(data, o); o += 4;
				var ver = rUs(data, o); o += 2;
				var gpflg = rUs(data, o); o += 2;
				//if((gpflg&8)!=0) throw "unknown sizes";
				var cmpr = rUs(data, o); o += 2;

				var time = rUi(data, o); o += 4;

				var crc32 = rUi(data, o); o += 4;
				//var csize = rUi(data, o);  o+=4;
				//var usize = rUi(data, o);  o+=4;
				o += 8;

				var nlen = rUs(data, o); o += 2;
				var elen = rUs(data, o); o += 2;

				var name = UZIP.bin.readUTF8(data, o, nlen); o += nlen;  //console.log(name);
				o += elen;

				//console.log(sign.toString(16), ver, gpflg, cmpr, crc32.toString(16), "csize, usize", csize, usize, nlen, elen, name, o);
				if (onlyNames) { out[name] = { size: usize, csize: csize }; return; }
				var file = new Uint8Array(data.buffer, o);
				if (false) { }
				else if (cmpr == 0) out[name] = new Uint8Array(file.buffer.slice(o, o + csize));
				else if (cmpr == 8) {
					var buf = new Uint8Array(usize); UZIP.inflateRaw(file, buf);
					/*var nbuf = pako["inflateRaw"](file);
					if(usize>8514000) {
						//console.log(PUtils.readASCII(buf , 8514500, 500));
						//console.log(PUtils.readASCII(nbuf, 8514500, 500));
					}
					for(var i=0; i<buf.length; i++) if(buf[i]!=nbuf[i]) {  console.log(buf.length, nbuf.length, usize, i);  throw "e";  }
					*/
					out[name] = buf;
				}
				else throw "unknown compression method: " + cmpr;
			}

			UZIP.inflateRaw = function (file, buf) {

				return UZIP.F.inflate(file, buf);
			}
			UZIP.inflate = function (file, buf) {
				var CMF = file[0], FLG = file[1];
				var CM = (CMF & 15), CINFO = (CMF >>> 4);
				//console.log(CM, CINFO,CMF,FLG);
				return UZIP.inflateRaw(new Uint8Array(file.buffer, file.byteOffset + 2, file.length - 6), buf);
			}
			UZIP.deflate = function (data, opts/*, buf, off*/) {
				if (opts == null) opts = { level: 6 };
				var off = 0, buf = new Uint8Array(50 + Math.floor(data.length * 1.1));
				buf[off] = 120; buf[off + 1] = 156; off += 2;
				off = UZIP.F.deflateRaw(data, buf, off, opts.level);
				var crc = UZIP.adler(data, 0, data.length);
				buf[off + 0] = ((crc >>> 24) & 255);
				buf[off + 1] = ((crc >>> 16) & 255);
				buf[off + 2] = ((crc >>> 8) & 255);
				buf[off + 3] = ((crc >>> 0) & 255);
				return new Uint8Array(buf.buffer, 0, off + 4);
			}
			UZIP.deflateRaw = function (data, opts) {
				if (opts == null) opts = { level: 6 };
				var buf = new Uint8Array(50 + Math.floor(data.length * 1.1));
				var off = UZIP.F.deflateRaw(data, buf, off, opts.level);
				return new Uint8Array(buf.buffer, 0, off);
			}


			UZIP.encode = function (obj, noCmpr) {
				if (noCmpr == null) noCmpr = false;
				var tot = 0, wUi = UZIP.bin.writeUint, wUs = UZIP.bin.writeUshort;
				var zpd = {};
				for (var p in obj) {
					var cpr = !UZIP._noNeed(p) && !noCmpr, buf = obj[p], crc = UZIP.crc.crc(buf, 0, buf.length);
					zpd[p] = {
						cpr: cpr,
						usize: buf.length,
						crc: crc,
						file: (cpr ? UZIP.deflateRaw(buf) : buf)
					};
				}

				for (var p in zpd) tot += zpd[p].file.length + 30 + 46 + 2 * UZIP.bin.sizeUTF8(p);
				tot += 22;

				var data = new Uint8Array(tot), o = 0;
				var fof = []

				for (var p in zpd) {
					var file = zpd[p]; fof.push(o);
					o = UZIP._writeHeader(data, o, p, file, 0);
				}
				var i = 0, ioff = o;
				for (var p in zpd) {
					var file = zpd[p]; fof.push(o);
					o = UZIP._writeHeader(data, o, p, file, 1, fof[i++]);
				}
				var csize = o - ioff;

				wUi(data, o, 0x06054b50); o += 4;
				o += 4;  // disks
				wUs(data, o, i); o += 2;
				wUs(data, o, i); o += 2;	// number of c d records
				wUi(data, o, csize); o += 4;
				wUi(data, o, ioff); o += 4;
				o += 2;
				return data.buffer;
			}
			// no need to compress .PNG, .ZIP, .JPEG ....
			UZIP._noNeed = function (fn) { var ext = fn.split(".").pop().toLowerCase(); return "png,jpg,jpeg,zip".indexOf(ext) != -1; }

			UZIP._writeHeader = function (data, o, p, obj, t, roff) {
				var wUi = UZIP.bin.writeUint, wUs = UZIP.bin.writeUshort;
				var file = obj.file;

				wUi(data, o, t == 0 ? 0x04034b50 : 0x02014b50); o += 4; // sign
				if (t == 1) o += 2;  // ver made by
				wUs(data, o, 20); o += 2;	// ver
				wUs(data, o, 0); o += 2;    // gflip
				wUs(data, o, obj.cpr ? 8 : 0); o += 2;	// cmpr

				wUi(data, o, 0); o += 4;	// time		
				wUi(data, o, obj.crc); o += 4;	// crc32
				wUi(data, o, file.length); o += 4;	// csize
				wUi(data, o, obj.usize); o += 4;	// usize

				wUs(data, o, UZIP.bin.sizeUTF8(p)); o += 2;	// nlen
				wUs(data, o, 0); o += 2;	// elen

				if (t == 1) {
					o += 2;  // comment length
					o += 2;  // disk number
					o += 6;  // attributes
					wUi(data, o, roff); o += 4;	// usize
				}
				var nlen = UZIP.bin.writeUTF8(data, o, p); o += nlen;
				if (t == 0) { data.set(file, o); o += file.length; }
				return o;
			}

			UZIP.uint8_to_string = function (arr) {
				let str = '';
				for (let i = 0; i < arr.length; i++) {
					str += String.fromCharCode(arr[i]);
				}
				return str;
			}



			UZIP.crc = {
				table: (function () {
					var tab = new Uint32Array(256);
					for (var n = 0; n < 256; n++) {
						var c = n;
						for (var k = 0; k < 8; k++) {
							if (c & 1) c = 0xedb88320 ^ (c >>> 1);
							else c = c >>> 1;
						}
						tab[n] = c;
					}
					return tab;
				})(),
				update: function (c, buf, off, len) {
					for (var i = 0; i < len; i++)  c = UZIP.crc.table[(c ^ buf[off + i]) & 0xff] ^ (c >>> 8);
					return c;
				},
				crc: function (b, o, l) { return UZIP.crc.update(0xffffffff, b, o, l) ^ 0xffffffff; }
			}
			UZIP.adler = function (data, o, len) {
				var a = 1, b = 0;
				var off = o, end = o + len;
				while (off < end) {
					var eend = Math.min(off + 5552, end);
					while (off < eend) {
						a += data[off++];
						b += a;
					}
					a = a % 65521;
					b = b % 65521;
				}
				return (b << 16) | a;
			}

			UZIP.bin = {
				readUshort: function (buff, p) { return (buff[p]) | (buff[p + 1] << 8); },
				writeUshort: function (buff, p, n) { buff[p] = (n) & 255; buff[p + 1] = (n >> 8) & 255; },
				readUint: function (buff, p) { return (buff[p + 3] * (256 * 256 * 256)) + ((buff[p + 2] << 16) | (buff[p + 1] << 8) | buff[p]); },
				writeUint: function (buff, p, n) { buff[p] = n & 255; buff[p + 1] = (n >> 8) & 255; buff[p + 2] = (n >> 16) & 255; buff[p + 3] = (n >> 24) & 255; },
				readASCII: function (buff, p, l) { var s = ""; for (var i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]); return s; },
				writeASCII: function (data, p, s) { for (var i = 0; i < s.length; i++) data[p + i] = s.charCodeAt(i); },
				pad: function (n) { return n.length < 2 ? "0" + n : n; },
				readUTF8: function (buff, p, l) {
					var s = "", ns;
					for (var i = 0; i < l; i++) s += "%" + UZIP.bin.pad(buff[p + i].toString(16));
					try { ns = decodeURIComponent(s); }
					catch (e) { return UZIP.bin.readASCII(buff, p, l); }
					return ns;
				},
				writeUTF8: function (buff, p, str) {
					var strl = str.length, i = 0;
					for (var ci = 0; ci < strl; ci++) {
						var code = str.charCodeAt(ci);
						if ((code & (0xffffffff - (1 << 7) + 1)) == 0) { buff[p + i] = (code); i++; }
						else if ((code & (0xffffffff - (1 << 11) + 1)) == 0) { buff[p + i] = (192 | (code >> 6)); buff[p + i + 1] = (128 | ((code >> 0) & 63)); i += 2; }
						else if ((code & (0xffffffff - (1 << 16) + 1)) == 0) { buff[p + i] = (224 | (code >> 12)); buff[p + i + 1] = (128 | ((code >> 6) & 63)); buff[p + i + 2] = (128 | ((code >> 0) & 63)); i += 3; }
						else if ((code & (0xffffffff - (1 << 21) + 1)) == 0) { buff[p + i] = (240 | (code >> 18)); buff[p + i + 1] = (128 | ((code >> 12) & 63)); buff[p + i + 2] = (128 | ((code >> 6) & 63)); buff[p + i + 3] = (128 | ((code >> 0) & 63)); i += 4; }
						else throw "e";
					}
					return i;
				},
				sizeUTF8: function (str) {
					var strl = str.length, i = 0;
					for (var ci = 0; ci < strl; ci++) {
						var code = str.charCodeAt(ci);
						if ((code & (0xffffffff - (1 << 7) + 1)) == 0) { i++; }
						else if ((code & (0xffffffff - (1 << 11) + 1)) == 0) { i += 2; }
						else if ((code & (0xffffffff - (1 << 16) + 1)) == 0) { i += 3; }
						else if ((code & (0xffffffff - (1 << 21) + 1)) == 0) { i += 4; }
						else throw "e";
					}
					return i;
				}
			}





			UZIP.F = {};

			UZIP.F.deflateRaw = function (data, out, opos, lvl) {
				var opts = [
	/*
		 ush good_length; /* reduce lazy search above this match length 
		 ush max_lazy;    /* do not perform lazy search above this match length 
         ush nice_length; /* quit search above this match length 
	*/
	/*      good lazy nice chain */
	/* 0 */[0, 0, 0, 0, 0],  /* store only */
	/* 1 */[4, 4, 8, 4, 0], /* max speed, no lazy matches */
	/* 2 */[4, 5, 16, 8, 0],
	/* 3 */[4, 6, 16, 16, 0],

	/* 4 */[4, 10, 16, 32, 0],  /* lazy matches */
	/* 5 */[8, 16, 32, 32, 0],
	/* 6 */[8, 16, 128, 128, 0],
	/* 7 */[8, 32, 128, 256, 0],
	/* 8 */[32, 128, 258, 1024, 1],
	/* 9 */[32, 258, 258, 4096, 1]]; /* max compression */

				var opt = opts[lvl];


				var U = UZIP.F.U, goodIndex = UZIP.F._goodIndex, hash = UZIP.F._hash, putsE = UZIP.F._putsE;
				var i = 0, pos = opos << 3, cvrd = 0, dlen = data.length;

				if (lvl == 0) {
					while (i < dlen) {
						var len = Math.min(0xffff, dlen - i);
						putsE(out, pos, (i + len == dlen ? 1 : 0)); pos = UZIP.F._copyExact(data, i, len, out, pos + 8); i += len;
					}
					return pos >>> 3;
				}

				var lits = U.lits, strt = U.strt, prev = U.prev, li = 0, lc = 0, bs = 0, ebits = 0, c = 0, nc = 0;  // last_item, literal_count, block_start
				if (dlen > 2) { nc = UZIP.F._hash(data, 0); strt[nc] = 0; }
				var nmch = 0, nmci = 0;

				for (i = 0; i < dlen; i++) {
					c = nc;
					//*
					if (i + 1 < dlen - 2) {
						nc = UZIP.F._hash(data, i + 1);
						var ii = ((i + 1) & 0x7fff);
						prev[ii] = strt[nc];
						strt[nc] = ii;
					} //*/
					if (cvrd <= i) {
						if ((li > 14000 || lc > 26697) && (dlen - i) > 100) {
							if (cvrd < i) { lits[li] = i - cvrd; li += 2; cvrd = i; }
							pos = UZIP.F._writeBlock(((i == dlen - 1) || (cvrd == dlen)) ? 1 : 0, lits, li, ebits, data, bs, i - bs, out, pos); li = lc = ebits = 0; bs = i;
						}

						var mch = 0;
						//if(nmci==i) mch= nmch;  else 
						if (i < dlen - 2) mch = UZIP.F._bestMatch(data, i, prev, c, Math.min(opt[2], dlen - i), opt[3]);
						/*
						if(mch!=0 && opt[4]==1 && (mch>>>16)<opt[1] && i+1<dlen-2) {
							nmch = UZIP.F._bestMatch(data, i+1, prev, nc, opt[2], opt[3]);  nmci=i+1;
							//var mch2 = UZIP.F._bestMatch(data, i+2, prev, nnc);  //nmci=i+1;
							if((nmch>>>16)>(mch>>>16)) mch=0;
						}//*/
						var len = mch >>> 16, dst = mch & 0xffff;  //if(i-dst<0) throw "e";
						if (mch != 0) {
							var len = mch >>> 16, dst = mch & 0xffff;  //if(i-dst<0) throw "e";
							var lgi = goodIndex(len, U.of0); U.lhst[257 + lgi]++;
							var dgi = goodIndex(dst, U.df0); U.dhst[dgi]++; ebits += U.exb[lgi] + U.dxb[dgi];
							lits[li] = (len << 23) | (i - cvrd); lits[li + 1] = (dst << 16) | (lgi << 8) | dgi; li += 2;
							cvrd = i + len;
						}
						else { U.lhst[data[i]]++; }
						lc++;
					}
				}
				if (bs != i || data.length == 0) {
					if (cvrd < i) { lits[li] = i - cvrd; li += 2; cvrd = i; }
					pos = UZIP.F._writeBlock(1, lits, li, ebits, data, bs, i - bs, out, pos); li = 0; lc = 0; li = lc = ebits = 0; bs = i;
				}
				while ((pos & 7) != 0) pos++;
				return pos >>> 3;
			}
			UZIP.F._bestMatch = function (data, i, prev, c, nice, chain) {
				var ci = (i & 0x7fff), pi = prev[ci];
				//console.log("----", i);
				var dif = ((ci - pi + (1 << 15)) & 0x7fff); if (pi == ci || c != UZIP.F._hash(data, i - dif)) return 0;
				var tl = 0, td = 0;  // top length, top distance
				var dlim = Math.min(0x7fff, i);
				while (dif <= dlim && --chain != 0 && pi != ci /*&& c==UZIP.F._hash(data,i-dif)*/) {
					if (tl == 0 || (data[i + tl] == data[i + tl - dif])) {
						var cl = UZIP.F._howLong(data, i, dif);
						if (cl > tl) {
							tl = cl; td = dif; if (tl >= nice) break;    //* 
							if (dif + 2 < cl) cl = dif + 2;
							var maxd = 0; // pi does not point to the start of the word
							for (var j = 0; j < cl - 2; j++) {
								var ei = (i - dif + j + (1 << 15)) & 0x7fff;
								var li = prev[ei];
								var curd = (ei - li + (1 << 15)) & 0x7fff;
								if (curd > maxd) { maxd = curd; pi = ei; }
							}  //*/
						}
					}

					ci = pi; pi = prev[ci];
					dif += ((ci - pi + (1 << 15)) & 0x7fff);
				}
				return (tl << 16) | td;
			}
			UZIP.F._howLong = function (data, i, dif) {
				if (data[i] != data[i - dif] || data[i + 1] != data[i + 1 - dif] || data[i + 2] != data[i + 2 - dif]) return 0;
				var oi = i, l = Math.min(data.length, i + 258); i += 3;
				//while(i+4<l && data[i]==data[i-dif] && data[i+1]==data[i+1-dif] && data[i+2]==data[i+2-dif] && data[i+3]==data[i+3-dif]) i+=4;
				while (i < l && data[i] == data[i - dif]) i++;
				return i - oi;
			}
			UZIP.F._hash = function (data, i) {
				return (((data[i] << 8) | data[i + 1]) + (data[i + 2] << 4)) & 0xffff;
				//var hash_shift = 0, hash_mask = 255;
				//var h = data[i+1] % 251;
				//h = (((h << 8) + data[i+2]) % 251);
				//h = (((h << 8) + data[i+2]) % 251);
				//h = ((h<<hash_shift) ^ (c) ) & hash_mask;
				//return h | (data[i]<<8);
				//return (data[i] | (data[i+1]<<8));
			}
			//UZIP.___toth = 0;
			UZIP.saved = 0;
			UZIP.F._writeBlock = function (BFINAL, lits, li, ebits, data, o0, l0, out, pos) {
				var U = UZIP.F.U, putsF = UZIP.F._putsF, putsE = UZIP.F._putsE;

				//*
				var T, ML, MD, MH, numl, numd, numh, lset, dset; U.lhst[256]++;
				T = UZIP.F.getTrees(); ML = T[0]; MD = T[1]; MH = T[2]; numl = T[3]; numd = T[4]; numh = T[5]; lset = T[6]; dset = T[7];

				var cstSize = (((pos + 3) & 7) == 0 ? 0 : 8 - ((pos + 3) & 7)) + 32 + (l0 << 3);
				var fxdSize = ebits + UZIP.F.contSize(U.fltree, U.lhst) + UZIP.F.contSize(U.fdtree, U.dhst);
				var dynSize = ebits + UZIP.F.contSize(U.ltree, U.lhst) + UZIP.F.contSize(U.dtree, U.dhst);
				dynSize += 14 + 3 * numh + UZIP.F.contSize(U.itree, U.ihst) + (U.ihst[16] * 2 + U.ihst[17] * 3 + U.ihst[18] * 7);

				for (var j = 0; j < 286; j++) U.lhst[j] = 0; for (var j = 0; j < 30; j++) U.dhst[j] = 0; for (var j = 0; j < 19; j++) U.ihst[j] = 0;
				//*/
				var BTYPE = (cstSize < fxdSize && cstSize < dynSize) ? 0 : (fxdSize < dynSize ? 1 : 2);
				putsF(out, pos, BFINAL); putsF(out, pos + 1, BTYPE); pos += 3;

				var opos = pos;
				if (BTYPE == 0) {
					while ((pos & 7) != 0) pos++;
					pos = UZIP.F._copyExact(data, o0, l0, out, pos);
				}
				else {
					var ltree, dtree;
					if (BTYPE == 1) { ltree = U.fltree; dtree = U.fdtree; }
					if (BTYPE == 2) {
						UZIP.F.makeCodes(U.ltree, ML); UZIP.F.revCodes(U.ltree, ML);
						UZIP.F.makeCodes(U.dtree, MD); UZIP.F.revCodes(U.dtree, MD);
						UZIP.F.makeCodes(U.itree, MH); UZIP.F.revCodes(U.itree, MH);

						ltree = U.ltree; dtree = U.dtree;

						putsE(out, pos, numl - 257); pos += 5;  // 286
						putsE(out, pos, numd - 1); pos += 5;  // 30
						putsE(out, pos, numh - 4); pos += 4;  // 19

						for (var i = 0; i < numh; i++) putsE(out, pos + i * 3, U.itree[(U.ordr[i] << 1) + 1]); pos += 3 * numh;
						pos = UZIP.F._codeTiny(lset, U.itree, out, pos);
						pos = UZIP.F._codeTiny(dset, U.itree, out, pos);
					}

					var off = o0;
					for (var si = 0; si < li; si += 2) {
						var qb = lits[si], len = (qb >>> 23), end = off + (qb & ((1 << 23) - 1));
						while (off < end) pos = UZIP.F._writeLit(data[off++], ltree, out, pos);

						if (len != 0) {
							var qc = lits[si + 1], dst = (qc >> 16), lgi = (qc >> 8) & 255, dgi = (qc & 255);
							pos = UZIP.F._writeLit(257 + lgi, ltree, out, pos);
							putsE(out, pos, len - U.of0[lgi]); pos += U.exb[lgi];

							pos = UZIP.F._writeLit(dgi, dtree, out, pos);
							putsF(out, pos, dst - U.df0[dgi]); pos += U.dxb[dgi]; off += len;
						}
					}
					pos = UZIP.F._writeLit(256, ltree, out, pos);
				}
				//console.log(pos-opos, fxdSize, dynSize, cstSize);
				return pos;
			}
			UZIP.F._copyExact = function (data, off, len, out, pos) {
				var p8 = (pos >>> 3);
				out[p8] = (len); out[p8 + 1] = (len >>> 8); out[p8 + 2] = 255 - out[p8]; out[p8 + 3] = 255 - out[p8 + 1]; p8 += 4;
				out.set(new Uint8Array(data.buffer, off, len), p8);
				//for(var i=0; i<len; i++) out[p8+i]=data[off+i];
				return pos + ((len + 4) << 3);
			}
			/*
				Interesting facts:
				- decompressed block can have bytes, which do not occur in a Huffman tree (copied from the previous block by reference)
			*/

			UZIP.F.getTrees = function () {
				var U = UZIP.F.U;
				var ML = UZIP.F._hufTree(U.lhst, U.ltree, 15);
				var MD = UZIP.F._hufTree(U.dhst, U.dtree, 15);
				var lset = [], numl = UZIP.F._lenCodes(U.ltree, lset);
				var dset = [], numd = UZIP.F._lenCodes(U.dtree, dset);
				for (var i = 0; i < lset.length; i += 2) U.ihst[lset[i]]++;
				for (var i = 0; i < dset.length; i += 2) U.ihst[dset[i]]++;
				var MH = UZIP.F._hufTree(U.ihst, U.itree, 7);
				var numh = 19; while (numh > 4 && U.itree[(U.ordr[numh - 1] << 1) + 1] == 0) numh--;
				return [ML, MD, MH, numl, numd, numh, lset, dset];
			}
			UZIP.F.getSecond = function (a) { var b = []; for (var i = 0; i < a.length; i += 2) b.push(a[i + 1]); return b; }
			UZIP.F.nonZero = function (a) { var b = ""; for (var i = 0; i < a.length; i += 2) if (a[i + 1] != 0) b += (i >> 1) + ","; return b; }
			UZIP.F.contSize = function (tree, hst) { var s = 0; for (var i = 0; i < hst.length; i++) s += hst[i] * tree[(i << 1) + 1]; return s; }
			UZIP.F._codeTiny = function (set, tree, out, pos) {
				for (var i = 0; i < set.length; i += 2) {
					var l = set[i], rst = set[i + 1];  //console.log(l, pos, tree[(l<<1)+1]);
					pos = UZIP.F._writeLit(l, tree, out, pos);
					var rsl = l == 16 ? 2 : (l == 17 ? 3 : 7);
					if (l > 15) { UZIP.F._putsE(out, pos, rst, rsl); pos += rsl; }
				}
				return pos;
			}
			UZIP.F._lenCodes = function (tree, set) {
				var len = tree.length; while (len != 2 && tree[len - 1] == 0) len -= 2;  // when no distances, keep one code with length 0
				for (var i = 0; i < len; i += 2) {
					var l = tree[i + 1], nxt = (i + 3 < len ? tree[i + 3] : -1), nnxt = (i + 5 < len ? tree[i + 5] : -1), prv = (i == 0 ? -1 : tree[i - 1]);
					if (l == 0 && nxt == l && nnxt == l) {
						var lz = i + 5;
						while (lz + 2 < len && tree[lz + 2] == l) lz += 2;
						var zc = Math.min((lz + 1 - i) >>> 1, 138);
						if (zc < 11) set.push(17, zc - 3);
						else set.push(18, zc - 11);
						i += zc * 2 - 2;
					}
					else if (l == prv && nxt == l && nnxt == l) {
						var lz = i + 5;
						while (lz + 2 < len && tree[lz + 2] == l) lz += 2;
						var zc = Math.min((lz + 1 - i) >>> 1, 6);
						set.push(16, zc - 3);
						i += zc * 2 - 2;
					}
					else set.push(l, 0);
				}
				return len >>> 1;
			}
			UZIP.F._hufTree = function (hst, tree, MAXL) {
				var list = [], hl = hst.length, tl = tree.length, i = 0;
				for (i = 0; i < tl; i += 2) { tree[i] = 0; tree[i + 1] = 0; }
				for (i = 0; i < hl; i++) if (hst[i] != 0) list.push({ lit: i, f: hst[i] });
				var end = list.length, l2 = list.slice(0);
				if (end == 0) return 0;  // empty histogram (usually for dist)
				if (end == 1) { var lit = list[0].lit, l2 = lit == 0 ? 1 : 0; tree[(lit << 1) + 1] = 1; tree[(l2 << 1) + 1] = 1; return 1; }
				list.sort(function (a, b) { return a.f - b.f; });
				var a = list[0], b = list[1], i0 = 0, i1 = 1, i2 = 2; list[0] = { lit: -1, f: a.f + b.f, l: a, r: b, d: 0 };
				while (i1 != end - 1) {
					if (i0 != i1 && (i2 == end || list[i0].f < list[i2].f)) { a = list[i0++]; } else { a = list[i2++]; }
					if (i0 != i1 && (i2 == end || list[i0].f < list[i2].f)) { b = list[i0++]; } else { b = list[i2++]; }
					list[i1++] = { lit: -1, f: a.f + b.f, l: a, r: b };
				}
				var maxl = UZIP.F.setDepth(list[i1 - 1], 0);
				if (maxl > MAXL) { UZIP.F.restrictDepth(l2, MAXL, maxl); maxl = MAXL; }
				for (i = 0; i < end; i++) tree[(l2[i].lit << 1) + 1] = l2[i].d;
				return maxl;
			}

			UZIP.F.setDepth = function (t, d) {
				if (t.lit != -1) { t.d = d; return d; }
				return Math.max(UZIP.F.setDepth(t.l, d + 1), UZIP.F.setDepth(t.r, d + 1));
			}

			UZIP.F.restrictDepth = function (dps, MD, maxl) {
				var i = 0, bCost = 1 << (maxl - MD), dbt = 0;
				dps.sort(function (a, b) { return b.d == a.d ? a.f - b.f : b.d - a.d; });

				for (i = 0; i < dps.length; i++) if (dps[i].d > MD) { var od = dps[i].d; dps[i].d = MD; dbt += bCost - (1 << (maxl - od)); } else break;
				dbt = dbt >>> (maxl - MD);
				while (dbt > 0) { var od = dps[i].d; if (od < MD) { dps[i].d++; dbt -= (1 << (MD - od - 1)); } else i++; }
				for (; i >= 0; i--) if (dps[i].d == MD && dbt < 0) { dps[i].d--; dbt++; } if (dbt != 0) console.log("debt left");
			}

			UZIP.F._goodIndex = function (v, arr) {
				var i = 0; if (arr[i | 16] <= v) i |= 16; if (arr[i | 8] <= v) i |= 8; if (arr[i | 4] <= v) i |= 4; if (arr[i | 2] <= v) i |= 2; if (arr[i | 1] <= v) i |= 1; return i;
			}
			UZIP.F._writeLit = function (ch, ltree, out, pos) {
				UZIP.F._putsF(out, pos, ltree[ch << 1]);
				return pos + ltree[(ch << 1) + 1];
			}

			UZIP.F.inflate = function (data, buf) {
				var u8 = Uint8Array;
				if (data[0] == 3 && data[1] == 0) return (buf ? buf : new u8(0));
				var F = UZIP.F, bitsF = F._bitsF, bitsE = F._bitsE, decodeTiny = F._decodeTiny, makeCodes = F.makeCodes, codes2map = F.codes2map, get17 = F._get17;
				var U = F.U;

				var noBuf = (buf == null);
				if (noBuf) buf = new u8((data.length >>> 2) << 3);

				var BFINAL = 0, BTYPE = 0, HLIT = 0, HDIST = 0, HCLEN = 0, ML = 0, MD = 0;
				var off = 0, pos = 0;
				var lmap, dmap;

				while (BFINAL == 0) {
					BFINAL = bitsF(data, pos, 1);
					BTYPE = bitsF(data, pos + 1, 2); pos += 3;
					//console.log(BFINAL, BTYPE);

					if (BTYPE == 0) {
						if ((pos & 7) != 0) pos += 8 - (pos & 7);
						var p8 = (pos >>> 3) + 4, len = data[p8 - 4] | (data[p8 - 3] << 8);  //console.log(len);//bitsF(data, pos, 16), 
						if (noBuf) buf = UZIP.F._check(buf, off + len);
						buf.set(new u8(data.buffer, data.byteOffset + p8, len), off);
						//for(var i=0; i<len; i++) buf[off+i] = data[p8+i];
						//for(var i=0; i<len; i++) if(buf[off+i] != data[p8+i]) throw "e";
						pos = ((p8 + len) << 3); off += len; continue;
					}
					if (noBuf) buf = UZIP.F._check(buf, off + (1 << 17));  // really not enough in many cases (but PNG and ZIP provide buffer in advance)
					if (BTYPE == 1) { lmap = U.flmap; dmap = U.fdmap; ML = (1 << 9) - 1; MD = (1 << 5) - 1; }
					if (BTYPE == 2) {
						HLIT = bitsE(data, pos, 5) + 257;
						HDIST = bitsE(data, pos + 5, 5) + 1;
						HCLEN = bitsE(data, pos + 10, 4) + 4; pos += 14;

						var ppos = pos;
						for (var i = 0; i < 38; i += 2) { U.itree[i] = 0; U.itree[i + 1] = 0; }
						var tl = 1;
						for (var i = 0; i < HCLEN; i++) { var l = bitsE(data, pos + i * 3, 3); U.itree[(U.ordr[i] << 1) + 1] = l; if (l > tl) tl = l; } pos += 3 * HCLEN;  //console.log(itree);
						makeCodes(U.itree, tl);
						codes2map(U.itree, tl, U.imap);

						lmap = U.lmap; dmap = U.dmap;

						pos = decodeTiny(U.imap, (1 << tl) - 1, HLIT + HDIST, data, pos, U.ttree);
						var mx0 = F._copyOut(U.ttree, 0, HLIT, U.ltree); ML = (1 << mx0) - 1;
						var mx1 = F._copyOut(U.ttree, HLIT, HDIST, U.dtree); MD = (1 << mx1) - 1;

						//var ml = decodeTiny(U.imap, (1<<tl)-1, HLIT , data, pos, U.ltree); ML = (1<<(ml>>>24))-1;  pos+=(ml&0xffffff);
						makeCodes(U.ltree, mx0);
						codes2map(U.ltree, mx0, lmap);

						//var md = decodeTiny(U.imap, (1<<tl)-1, HDIST, data, pos, U.dtree); MD = (1<<(md>>>24))-1;  pos+=(md&0xffffff);
						makeCodes(U.dtree, mx1);
						codes2map(U.dtree, mx1, dmap);
					}
					//var ooff=off, opos=pos;
					while (true) {
						var code = lmap[get17(data, pos) & ML]; pos += code & 15;
						var lit = code >>> 4;  //U.lhst[lit]++;  
						if ((lit >>> 8) == 0) { buf[off++] = lit; }
						else if (lit == 256) { break; }
						else {
							var end = off + lit - 254;
							if (lit > 264) { var ebs = U.ldef[lit - 257]; end = off + (ebs >>> 3) + bitsE(data, pos, ebs & 7); pos += ebs & 7; }
							//UZIP.F.dst[end-off]++;

							var dcode = dmap[get17(data, pos) & MD]; pos += dcode & 15;
							var dlit = dcode >>> 4;
							var dbs = U.ddef[dlit], dst = (dbs >>> 4) + bitsF(data, pos, dbs & 15); pos += dbs & 15;

							//var o0 = off-dst, stp = Math.min(end-off, dst);
							//if(stp>20) while(off<end) {  buf.copyWithin(off, o0, o0+stp);  off+=stp;  }  else
							//if(end-dst<=off) buf.copyWithin(off, off-dst, end-dst);  else
							//if(dst==1) buf.fill(buf[off-1], off, end);  else
							if (noBuf) buf = UZIP.F._check(buf, off + (1 << 17));
							while (off < end) { buf[off] = buf[off++ - dst]; buf[off] = buf[off++ - dst]; buf[off] = buf[off++ - dst]; buf[off] = buf[off++ - dst]; }
							off = end;
							//while(off!=end) {  buf[off]=buf[off++-dst];  }
						}
					}
					//console.log(off-ooff, (pos-opos)>>>3);
				}
				//console.log(UZIP.F.dst);
				//console.log(tlen, dlen, off-tlen+tcnt);
				return buf.length == off ? buf : buf.slice(0, off);
			}
			UZIP.F._check = function (buf, len) {
				var bl = buf.length; if (len <= bl) return buf;
				var nbuf = new Uint8Array(Math.max(bl << 1, len)); nbuf.set(buf, 0);
				//for(var i=0; i<bl; i+=4) {  nbuf[i]=buf[i];  nbuf[i+1]=buf[i+1];  nbuf[i+2]=buf[i+2];  nbuf[i+3]=buf[i+3];  }
				return nbuf;
			}

			UZIP.F._decodeTiny = function (lmap, LL, len, data, pos, tree) {
				var bitsE = UZIP.F._bitsE, get17 = UZIP.F._get17;
				var i = 0;
				while (i < len) {
					var code = lmap[get17(data, pos) & LL]; pos += code & 15;
					var lit = code >>> 4;
					if (lit <= 15) { tree[i] = lit; i++; }
					else {
						var ll = 0, n = 0;
						if (lit == 16) {
							n = (3 + bitsE(data, pos, 2)); pos += 2; ll = tree[i - 1];
						}
						else if (lit == 17) {
							n = (3 + bitsE(data, pos, 3)); pos += 3;
						}
						else if (lit == 18) {
							n = (11 + bitsE(data, pos, 7)); pos += 7;
						}
						var ni = i + n;
						while (i < ni) { tree[i] = ll; i++; }
					}
				}
				return pos;
			}
			UZIP.F._copyOut = function (src, off, len, tree) {
				var mx = 0, i = 0, tl = tree.length >>> 1;
				while (i < len) { var v = src[i + off]; tree[(i << 1)] = 0; tree[(i << 1) + 1] = v; if (v > mx) mx = v; i++; }
				while (i < tl) { tree[(i << 1)] = 0; tree[(i << 1) + 1] = 0; i++; }
				return mx;
			}

			UZIP.F.makeCodes = function (tree, MAX_BITS) {  // code, length
				var U = UZIP.F.U;
				var max_code = tree.length;
				var code, bits, n, i, len;

				var bl_count = U.bl_count; for (var i = 0; i <= MAX_BITS; i++) bl_count[i] = 0;
				for (i = 1; i < max_code; i += 2) bl_count[tree[i]]++;

				var next_code = U.next_code;	// smallest code for each length

				code = 0;
				bl_count[0] = 0;
				for (bits = 1; bits <= MAX_BITS; bits++) {
					code = (code + bl_count[bits - 1]) << 1;
					next_code[bits] = code;
				}

				for (n = 0; n < max_code; n += 2) {
					len = tree[n + 1];
					if (len != 0) {
						tree[n] = next_code[len];
						next_code[len]++;
					}
				}
			}
			UZIP.F.codes2map = function (tree, MAX_BITS, map) {
				var max_code = tree.length;
				var U = UZIP.F.U, r15 = U.rev15;
				for (var i = 0; i < max_code; i += 2) if (tree[i + 1] != 0) {
					var lit = i >> 1;
					var cl = tree[i + 1], val = (lit << 4) | cl; // :  (0x8000 | (U.of0[lit-257]<<7) | (U.exb[lit-257]<<4) | cl);
					var rest = (MAX_BITS - cl), i0 = tree[i] << rest, i1 = i0 + (1 << rest);
					//tree[i]=r15[i0]>>>(15-MAX_BITS);
					while (i0 != i1) {
						var p0 = r15[i0] >>> (15 - MAX_BITS);
						map[p0] = val; i0++;
					}
				}
			}
			UZIP.F.revCodes = function (tree, MAX_BITS) {
				var r15 = UZIP.F.U.rev15, imb = 15 - MAX_BITS;
				for (var i = 0; i < tree.length; i += 2) { var i0 = (tree[i] << (MAX_BITS - tree[i + 1])); tree[i] = r15[i0] >>> imb; }
			}

			// used only in deflate
			UZIP.F._putsE = function (dt, pos, val) { val = val << (pos & 7); var o = (pos >>> 3); dt[o] |= val; dt[o + 1] |= (val >>> 8); }
			UZIP.F._putsF = function (dt, pos, val) { val = val << (pos & 7); var o = (pos >>> 3); dt[o] |= val; dt[o + 1] |= (val >>> 8); dt[o + 2] |= (val >>> 16); }

			UZIP.F._bitsE = function (dt, pos, length) { return ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8)) >>> (pos & 7)) & ((1 << length) - 1); }
			UZIP.F._bitsF = function (dt, pos, length) { return ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8) | (dt[(pos >>> 3) + 2] << 16)) >>> (pos & 7)) & ((1 << length) - 1); }
			/*
			UZIP.F._get9 = function(dt, pos) {
				return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8))>>>(pos&7))&511;
			} */
			UZIP.F._get17 = function (dt, pos) {	// return at least 17 meaningful bytes
				return (dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8) | (dt[(pos >>> 3) + 2] << 16)) >>> (pos & 7);
			}
			UZIP.F._get25 = function (dt, pos) {	// return at least 17 meaningful bytes
				return (dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8) | (dt[(pos >>> 3) + 2] << 16) | (dt[(pos >>> 3) + 3] << 24)) >>> (pos & 7);
			}
			UZIP.F.U = function () {
				var u16 = Uint16Array, u32 = Uint32Array;
				return {
					next_code: new u16(16),
					bl_count: new u16(16),
					ordr: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
					of0: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999],
					exb: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0],
					ldef: new u16(32),
					df0: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535, 65535],
					dxb: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0],
					ddef: new u32(32),
					flmap: new u16(512), fltree: [],
					fdmap: new u16(32), fdtree: [],
					lmap: new u16(32768), ltree: [], ttree: [],
					dmap: new u16(32768), dtree: [],
					imap: new u16(512), itree: [],
					//rev9 : new u16(  512)
					rev15: new u16(1 << 15),
					lhst: new u32(286), dhst: new u32(30), ihst: new u32(19),
					lits: new u32(15000),
					strt: new u16(1 << 16),
					prev: new u16(1 << 15)
				};
			}();

			(function () {
				var U = UZIP.F.U;
				var len = 1 << 15;
				for (var i = 0; i < len; i++) {
					var x = i;
					x = (((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1));
					x = (((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2));
					x = (((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4));
					x = (((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8));
					U.rev15[i] = (((x >>> 16) | (x << 16))) >>> 17;
				}

				function pushV(tgt, n, sv) { while (n-- != 0) tgt.push(0, sv); }

				for (var i = 0; i < 32; i++) { U.ldef[i] = (U.of0[i] << 3) | U.exb[i]; U.ddef[i] = (U.df0[i] << 4) | U.dxb[i]; }

				pushV(U.fltree, 144, 8); pushV(U.fltree, 255 - 143, 9); pushV(U.fltree, 279 - 255, 7); pushV(U.fltree, 287 - 279, 8);
				/*
				var i = 0;
				for(; i<=143; i++) U.fltree.push(0,8);
				for(; i<=255; i++) U.fltree.push(0,9);
				for(; i<=279; i++) U.fltree.push(0,7);
				for(; i<=287; i++) U.fltree.push(0,8);
				*/
				UZIP.F.makeCodes(U.fltree, 9);
				UZIP.F.codes2map(U.fltree, 9, U.flmap);
				UZIP.F.revCodes(U.fltree, 9)

				pushV(U.fdtree, 32, 5);
				//for(i=0;i<32; i++) U.fdtree.push(0,5);
				UZIP.F.makeCodes(U.fdtree, 5);
				UZIP.F.codes2map(U.fdtree, 5, U.fdmap);
				UZIP.F.revCodes(U.fdtree, 5)

				pushV(U.itree, 19, 0); pushV(U.ltree, 286, 0); pushV(U.dtree, 30, 0); pushV(U.ttree, 320, 0);
				/*
				for(var i=0; i< 19; i++) U.itree.push(0,0);
				for(var i=0; i<286; i++) U.ltree.push(0,0);
				for(var i=0; i< 30; i++) U.dtree.push(0,0);
				for(var i=0; i<320; i++) U.ttree.push(0,0);
				*/
			})()



			UZIP.LZString = (function () {
				function a(a, b) {
					if (!e[a]) {
						e[a] = {};
						for (var c = 0; c < a.length; c++) e[a][a.charAt(c)] = c;
					}
					return e[a][b];
				}
				var b = String.fromCharCode,
					c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
					d = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",
					e = {},
					f = {
						compressToBase64: function (a) {
							if (null == a) return "";
							var b = f._compress(a, 6, function (a) {
								return c.charAt(a);
							});
							switch (b.length % 4) {
								default:
								case 0:
									return b;
								case 1:
									return b + "===";
								case 2:
									return b + "==";
								case 3:
									return b + "=";
							}
						},
						decompressFromBase64: function (b) {
							return null == b
								? ""
								: "" == b
									? null
									: f._decompress(b.length, 32, function (d) {
										return a(c, b.charAt(d));
									});
						},
						compressToUTF16: function (a) {
							return null == a
								? ""
								: f._compress(a, 15, function (a) {
									return b(a + 32);
								}) + " ";
						},
						decompressFromUTF16: function (a) {
							return null == a
								? ""
								: "" == a
									? null
									: f._decompress(a.length, 16384, function (b) {
										return a.charCodeAt(b) - 32;
									});
						},
						compressToUint8Array: function (a) {
							for (var b = f.compress(a), c = new Uint8Array(2 * b.length), d = 0, e = b.length; e > d; d++) {
								var g = b.charCodeAt(d);
								(c[2 * d] = g >>> 8), (c[2 * d + 1] = g % 256);
							}
							return c;
						},
						decompressFromUint8Array: function (a) {
							if (null === a || void 0 === a) return f.decompress(a);
							for (var c = new Array(a.length / 2), d = 0, e = c.length; e > d; d++) c[d] = 256 * a[2 * d] + a[2 * d + 1];
							var g = [];
							return (
								c.forEach(function (a) {
									g.push(b(a));
								}),
								f.decompress(g.join(""))
							);
						},
						compressToEncodedURIComponent: function (a) {
							return null == a
								? ""
								: f._compress(a, 6, function (a) {
									return d.charAt(a);
								});
						},
						decompressFromEncodedURIComponent: function (b) {
							return null == b
								? ""
								: "" == b
									? null
									: ((b = b.replace(/ /g, "+")),
										f._decompress(b.length, 32, function (c) {
											return a(d, b.charAt(c));
										}));
						},
						compress: function (a) {
							return f._compress(a, 16, function (a) {
								return b(a);
							});
						},
						_compress: function (a, b, c) {
							if (null == a) return "";
							var d,
								e,
								f,
								g = {},
								h = {},
								i = "",
								j = "",
								k = "",
								l = 2,
								m = 3,
								n = 2,
								o = [],
								p = 0,
								q = 0;
							for (f = 0; f < a.length; f += 1)
								if (((i = a.charAt(f)), Object.prototype.hasOwnProperty.call(g, i) || ((g[i] = m++), (h[i] = !0)), (j = k + i), Object.prototype.hasOwnProperty.call(g, j))) k = j;
								else {
									if (Object.prototype.hasOwnProperty.call(h, k)) {
										if (k.charCodeAt(0) < 256) {
											for (d = 0; n > d; d++) (p <<= 1), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++;
											for (e = k.charCodeAt(0), d = 0; 8 > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
										} else {
											for (e = 1, d = 0; n > d; d++) (p = (p << 1) | e), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e = 0);
											for (e = k.charCodeAt(0), d = 0; 16 > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
										}
										l--, 0 == l && ((l = Math.pow(2, n)), n++), delete h[k];
									} else for (e = g[k], d = 0; n > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
									l--, 0 == l && ((l = Math.pow(2, n)), n++), (g[j] = m++), (k = String(i));
								}
							if ("" !== k) {
								if (Object.prototype.hasOwnProperty.call(h, k)) {
									if (k.charCodeAt(0) < 256) {
										for (d = 0; n > d; d++) (p <<= 1), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++;
										for (e = k.charCodeAt(0), d = 0; 8 > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
									} else {
										for (e = 1, d = 0; n > d; d++) (p = (p << 1) | e), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e = 0);
										for (e = k.charCodeAt(0), d = 0; 16 > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
									}
									l--, 0 == l && ((l = Math.pow(2, n)), n++), delete h[k];
								} else for (e = g[k], d = 0; n > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
								0 == --l && ((l = Math.pow(2, n)), n++);
							}
							for (e = 2, d = 0; n > d; d++) (p = (p << 1) | (1 & e)), q == b - 1 ? ((q = 0), o.push(c(p)), (p = 0)) : q++, (e >>= 1);
							for (; ;) {
								if (((p <<= 1), q == b - 1)) {
									o.push(c(p));
									break;
								}
								q++;
							}
							return o.join("");
						},
						decompress: function (a) {
							return null == a
								? ""
								: "" == a
									? null
									: f._decompress(a.length, 32768, function (b) {
										return a.charCodeAt(b);
									});
						},
						_decompress: function (a, c, d) {
							var e,
								f,
								g,
								h,
								i,
								j,
								k,
								l = [],
								m = 4,
								n = 4,
								o = 3,
								p = "",
								q = [],
								r = { val: d(0), position: c, index: 1 };
							for (e = 0; 3 > e; e += 1) l[e] = e;
							for (g = 0, i = Math.pow(2, 2), j = 1; j != i;) (h = r.val & r.position), (r.position >>= 1), 0 == r.position && ((r.position = c), (r.val = d(r.index++))), (g |= (h > 0 ? 1 : 0) * j), (j <<= 1);
							switch (g) {
								case 0:
									for (g = 0, i = Math.pow(2, 8), j = 1; j != i;) (h = r.val & r.position), (r.position >>= 1), 0 == r.position && ((r.position = c), (r.val = d(r.index++))), (g |= (h > 0 ? 1 : 0) * j), (j <<= 1);
									k = b(g);
									break;
								case 1:
									for (g = 0, i = Math.pow(2, 16), j = 1; j != i;) (h = r.val & r.position), (r.position >>= 1), 0 == r.position && ((r.position = c), (r.val = d(r.index++))), (g |= (h > 0 ? 1 : 0) * j), (j <<= 1);
									k = b(g);
									break;
								case 2:
									return "";
							}
							for (l[3] = k, f = k, q.push(k); ;) {
								if (r.index > a) return "";
								for (g = 0, i = Math.pow(2, o), j = 1; j != i;) (h = r.val & r.position), (r.position >>= 1), 0 == r.position && ((r.position = c), (r.val = d(r.index++))), (g |= (h > 0 ? 1 : 0) * j), (j <<= 1);
								switch ((k = g)) {
									case 0:
										for (g = 0, i = Math.pow(2, 8), j = 1; j != i;) (h = r.val & r.position), (r.position >>= 1), 0 == r.position && ((r.position = c), (r.val = d(r.index++))), (g |= (h > 0 ? 1 : 0) * j), (j <<= 1);
										(l[n++] = b(g)), (k = n - 1), m--;
										break;
									case 1:
										for (g = 0, i = Math.pow(2, 16), j = 1; j != i;) (h = r.val & r.position), (r.position >>= 1), 0 == r.position && ((r.position = c), (r.val = d(r.index++))), (g |= (h > 0 ? 1 : 0) * j), (j <<= 1);
										(l[n++] = b(g)), (k = n - 1), m--;
										break;
									case 2:
										return q.join("");
								}
								if ((0 == m && ((m = Math.pow(2, o)), o++), l[k])) p = l[k];
								else {
									if (k !== n) return null;
									p = f + f.charAt(0);
								}
								q.push(p), (l[n++] = f + p.charAt(0)), m--, (f = p), 0 == m && ((m = Math.pow(2, o)), o++);
							}
						},
					};
				return f;
			})();

			return UZIP;

		});

	});


	packing.register("wasm", function () {

		packing(function (entry) {
			return new Promise(function (wasm_loaded) {
				packing.run_bundle(["wazip", "@/wazip.zip"], "define", "zip", "hash_str", "str_uint8")("wbuild", function (wazip, zip, define, hash_str, str_uint8) {

					const wbuild = this;
					const wbuildzip = zip.parse(wazip);
					console.log(wbuildzip);
					const each = function (callback, index) {
						const func = function (index) {
							callback(func, index);
						};
						func(index || 0);
					};

					const array_to_text = function (arr) {
						let m = "";
						for (let i = 0; i < arr.length; i++) {
							m += String.fromCharCode(arr[i]);
						}
						return m;
					};

					const array_buffer_to_b64 = function (buffer) {
						let binary = '';
						let bytes = new Uint8Array(buffer);
						let len = bytes.byteLength;
						for (let i = 0; i < len; i++) {
							binary += String.fromCharCode(bytes[i]);
						}
						return btoa(binary);
					};


					let memory = define(function (proto) {
						function memory(memory) {
							this.memory = memory;
							this.buffer = memory.buffer;
							this.u8 = new Uint8Array(this.memory.buffer);
							this.u32 = new Uint32Array(this.memory.buffer);
						}
						proto.check = function check() {
							if (this.buffer.byteLength === 0) {
								this.buffer = this.memory.buffer;
								this.u8 = new Uint8Array(this.buffer);
								this.u32 = new Uint32Array(this.buffer);
							}
						};
						proto.read8 = function read8(o) {
							return this.u8[o];
						};
						proto.read32 = function read32(o) {
							return this.u32[o >> 2];
						};
						proto.write8 = function write8(o, v) {
							this.u8[o] = v;
						};
						proto.write32 = function write32(o, v) {
							this.u32[o >> 2] = v;
						};
						proto.write64 = function write64(o, vlo, vhi) {
							if (vhi === void 0) {
								vhi = 0;
							}
							this.write32(o, vlo);
							this.write32(o + 4, vhi);
						};
						proto.readStr = (function (_readStr) {
							function readStr(_x, _x2) {
								return _readStr.apply(this, arguments);
							}
							readStr.toString = function () {
								return _readStr.toString();
							};
							return readStr;
						})(
							function (o, len) {
								return readStr(this.u8, o, len);
							}
						);
						proto.writeStr = function writeStr(o, str) {
							o += this.write(o, str);
							this.write8(o, 0);
							return str.length + 1;
						};
						proto.write = function write(o, buf) {
							if (buf instanceof ArrayBuffer) {
								return this.write(o, new Uint8Array(buf));
							} else if (typeof buf === "string") {
								return this.write(
									o,
									buf.split("").map(function (x) {
										return x.charCodeAt(0);
									})
								);
							} else {
								let dst = new Uint8Array(this.buffer, o, buf.length);
								dst.set(buf);
								return buf.length;
							}
						};

						return memory;

					});
					let tar = define(function (proto) {
						function Tar(buffer) {
							this.u8 = new Uint8Array(buffer);
							this.offset = 0;
						}

						proto.readStr = (function (_readStr) {
							function readStr(_x) {
								return _readStr.apply(this, arguments);
							}
							readStr.toString = function () {
								return _readStr.toString();
							};
							return readStr;
						})(function (len) {
							let result = readStr(this.u8, this.offset, len);
							this.offset += len;
							return result;
						});
						proto.readOctal = function readOctal(len) {
							return parseInt(this.readStr(len), 8);
						};
						proto.alignUp = function alignUp() {
							this.offset = (this.offset + 511) & ~511;
						};
						proto.readEntry = function readEntry() {
							if (this.offset + 512 > this.u8.length) {
								return null;
							}
							let entry = {
								filename: this.readStr(100),
								mode: this.readOctal(8),
								owner: this.readOctal(8),
								group: this.readOctal(8),
								size: this.readOctal(12),
								mtim: this.readOctal(12),
								checksum: this.readOctal(8),
								type: this.readStr(1),
								linkname: this.readStr(100)
							};
							if (this.readStr(8) !== "ustar  ") {
								return null;
							}
							entry.ownerName = this.readStr(32);
							entry.groupName = this.readStr(32);
							entry.devMajor = this.readStr(8);
							entry.devMinor = this.readStr(8);
							entry.filenamePrefix = this.readStr(155);
							this.alignUp();
							if (entry.type === "0") {
								// Regular file.
								entry.contents = this.u8.subarray(this.offset, this.offset + entry.size);
								this.offset += entry.size;
								this.alignUp();
							} else if (entry.type !== "5") {
								// Directory.
								console.log("type", entry.type);
								assert(false);
							}
							return entry;
						};
						proto.untar = function untar(memfs) {
							let entry;
							while ((entry = this.readEntry())) {
								switch (entry.type) {
									case "0":
										// Regular file.
										//console.log("tar", entry.filename);
										memfs.addFile(entry.filename, entry.contents);
										break;
									case "5":
										//console.log("dir", entry.filename);
										memfs.addDirectory(entry.filename);
										break;
								}
							}
						};


						return Tar;

					});
					let mem_fs = define(function (proto) {
						function mem_fs(options) {
							this.stdinStr = "";
							this.hostMem_ = null;
							this.host_writes = "";
							this.dirs_added = {};
						};


						proto.prepare = function (module) {
							let _this = this;

							const env = {
								"abort": this.abort.bind(this),
								"host_write": this.host_write.bind(this),
								"host_read": this.host_read.bind(this),
								"memfs_log": this.memfs_log.bind(this),
								"copy_in": this.copy_in.bind(this),
								"copy_out": this.copy_out.bind(this)
							}
							return new Promise(function (res) {
								WebAssembly.instantiate(module, { env: env }).then(function (instance) {

									_this.instance = instance;
									_this.exports = _this.instance.exports;
									_this.mem = new memory(instance.exports.memory);
									_this.exports.init();

									res();
								});
							});
						};


						proto.setStdinStr = function setStdinStr(str) {
							this.stdinStr = str;
							this.stdinStrPos = 0;
						};
						proto.addDirectory = function addDirectory(path) {
							if (this.dirs_added[path]) return;
							//console.log("dir", path);
							this.mem.check();
							this.mem.write(this.exports.GetPathBuf(), path);
							this.exports.AddDirectoryNode(path.length);
							this.dirs_added[path] = true;
						};
						proto.addFile = function addFile(path, contents) {
							let length =
								contents instanceof ArrayBuffer ? contents.byteLength : contents.length;
							this.mem.check();
							this.mem.write(this.exports.GetPathBuf(), path);
							let inode = this.exports.AddFileNode(path.length, length);
							let addr = this.exports.GetFileNodeAddress(inode);
							this.mem.check();
							this.mem.write(addr, contents);
						};

						proto.addFile2 = function addFile(path, contents) {
							const _this = this;
							let paths = path.split("/");
							paths.pop();
							let pp = "";
							paths.forEach(function (p) {
								pp += p + "/";
								_this.addDirectory(pp);


							});




							let length =
								contents instanceof ArrayBuffer ? contents.byteLength : contents.length;
							this.mem.check();
							this.mem.write(this.exports.GetPathBuf(), path);
							let inode = this.exports.AddFileNode(path.length, length);
							let addr = this.exports.GetFileNodeAddress(inode);
							this.mem.check();
							this.mem.write(addr, contents);
						};

						proto.getFileContents = function getFileContents(path) {
							this.mem.check();
							this.mem.write(this.exports.GetPathBuf(), path);
							let inode = this.exports.FindNode(path.length);
							let addr = this.exports.GetFileNodeAddress(inode);
							let size = this.exports.GetFileNodeSize(inode);
							return new Uint8Array(this.mem.buffer, addr, size);
						};

						proto.get_file_text = function (path) {
							return array_to_text(this.getFileContents(path));
						};

						proto.abort = function abort() {
							throw new Error("Abort");
						};
						proto.host_write = function host_write(fd, iovs, iovs_len, nwritten_out) {
							this.hostMem_.check();
							assert(fd <= 2);
							let size = 0;
							let str = "";
							for (let i = 0; i < iovs_len; ++i) {
								let buf = this.hostMem_.read32(iovs);
								iovs += 4;
								let len = this.hostMem_.read32(iovs);
								iovs += 4;
								str += this.hostMem_.readStr(buf, len);
								size += len;
							}
							this.hostMem_.write32(nwritten_out, size);
							this.host_writes += str;
							//this.hostWrite(str);
							return 0;
						};
						proto.host_read = function host_read(fd, iovs, iovs_len, nread) {
							this.hostMem_.check();
							assert(fd === 0);
							let size = 0;
							for (let i = 0; i < iovs_len; ++i) {
								let buf = this.hostMem_.read32(iovs);
								iovs += 4;
								let len = this.hostMem_.read32(iovs);
								iovs += 4;
								let lenToWrite = Math.min(len, this.stdinStr.length - this.stdinStrPos);
								if (lenToWrite === 0) {
									break;
								}
								this.hostMem_.write(
									buf,
									this.stdinStr.substr(this.stdinStrPos, lenToWrite)
								);
								size += lenToWrite;
								this.stdinStrPos += lenToWrite;
								if (lenToWrite !== len) {
									break;
								}
							}

							this.hostMem_.write32(nread, size);
							return 0;
						};
						proto.memfs_log = function memfs_log(buf, len) {
							this.mem.check();
							console.log(this.mem.readStr(buf, len));
						};
						proto.copy_out = function copy_out(clang_dst, memfs_src, size) {
							this.hostMem_.check();
							let dst = new Uint8Array(this.hostMem_.buffer, clang_dst, size);
							this.mem.check();
							let src = new Uint8Array(this.mem.buffer, memfs_src, size);

							dst.set(src);
						};
						proto.copy_in = function copy_in(memfs_dst, clang_src, size) {
							this.mem.check();
							let dst = new Uint8Array(this.mem.buffer, memfs_dst, size);
							this.hostMem_.check();
							let src = new Uint8Array(this.hostMem_.buffer, clang_src, size);

							dst.set(src);
						};
						proto.add_include_file = function (url, name) {
							const self = this;
							wbuild.__resolve(url, function (data) {
								self.addFile(name, data);
							});
						}
						return mem_fs;

					});


					wbuild.create_memfs = function (includes) {

						includes = includes || [];
						includes.unshift({
							"include/wasm.h": `
#ifndef WASM_HEADER
#define WASM_HEADER
#include <stdint.h>
#include <stdlib.h>

#define JS(...)
#endif
`,

							"include/print.h": `
#include<wasm.h>
extern "C" void print_call(const char*, int);


extern "C" void params_call(int,const char*,int);

#ifndef PRINT_HEADER
#define PRINT_HEADER

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdarg.h>





char print_buff[1024];
void print(const char* fmt, ...) {

	va_list arg;
	va_start(arg, fmt);
	vsprintf(print_buff, fmt, arg);
	va_end(arg);
	print_call(print_buff, strlen(print_buff));
}
void params(int id, const char* fmt, ...) {

	va_list arg;
	va_start(arg, fmt);
	vsprintf(print_buff, fmt, arg);
	va_end(arg);
	params_call(id,print_buff, strlen(print_buff));
}

const char* sprint(const char* fmt, ...) {

	va_list arg;
	va_start(arg, fmt);
	vsprintf(print_buff, fmt, arg);
	va_end(arg);
	return print_buff;
}
#endif
`
						});
						const modu = this.mem_fs;


						return new Promise(function (done) {
							let _mem_fs = new mem_fs();

							_mem_fs.prepare(modu).then(function () {
								(new tar(wbuildzip["sysroot.tar"].buffer)).untar(_mem_fs);
								each(function (next, i) {
									if (i < includes.length) {
										const inc = includes[i];
										if (define.is_object(inc)) {
											for (let k in inc) {
												_mem_fs.addFile2(k, inc[k]);
											}
											next(i + 1);
										}
										else {
											wbuild.__resolve(inc[1], function (data) {
												_mem_fs.addFile(inc[0], data);
												next(i + 1);
											});
										}
									}
									else {
										done(_mem_fs);
									}
								});

							});
						});
					};
					function assert(cond) {
						if (!cond) {
							throw new Error('assertion failed.');
						}
					}
					function readStr(u8, o, len = -1) {
						let str = '';
						let end = u8.length;
						if (len != -1)
							end = o + len;
						for (let i = o; i < end && u8[i] != 0; ++i)
							str += String.fromCharCode(u8[i]);
						return str;
					}
					const RG = function (match, func) {
						if (match !== null) match.forEach(func);
					};


					wbuild.load = function () {
						return new Promise(function (wbuild_loaded) {
							Promise.all([
								WebAssembly.compile(wbuildzip["memfs.wasm"]),
								WebAssembly.compile(wbuildzip["clang.wasm"]),
								WebAssembly.compile(wbuildzip["lld.wasm"])])
								.then(function (modules) {
									wbuild.mem_fs = modules[0];
									const clang = modules[1];
									const lld = modules[2];
									wbuild.mem_fs = modules[0];
									wbuild.compile_wasm = (function () {
										const _queue =[];
										let is_busy = false;


										const environ = { USER: '' }
										const wasi_unstable = {};
										wbuild.wasi_unstable = wasi_unstable;

										const names = Object.getOwnPropertyNames(environ);

										let __instance, __exports, __mem, __argv;

										wasi_unstable.proc_exit = function (code) {
											throw new Error("abort:" + code);
										};

										wasi_unstable.environ_sizes_get = function (environ_count_out, environ_buf_size_out) {
											__mem.check();
											let size = 0;
											names.forEach(function (name) {
												const value = environ[name];
												size += name.length + value.length + 2;
											});

											__mem.write64(environ_count_out, names.length);
											__mem.write64(environ_buf_size_out, size);
											return 0;
										}

										wasi_unstable.environ_get = function (environ_ptrs, environ_buf) {
											__mem.check();
											names.forEach(function (name) {
												__mem.write32(environ_ptrs, environ_buf);
												environ_ptrs += 4;
												environ_buf += __mem.writeStr(environ_buf, name + "=" + environ[name]);
											});

											__mem.write32(environ_ptrs, 0);
											return 0;
										}

										wasi_unstable.args_sizes_get = function (argc_out, argv_buf_size_out) {
											__mem.check();
											let size = 0;
											__argv.forEach(function (arg) {
												size += arg.length + 1;  // "arg\0".
											});

											__mem.write64(argc_out, __argv.length);
											__mem.write64(argv_buf_size_out, size);
											return 0;
										}

										wasi_unstable.args_get = function (argv_ptrs, argv_buf) {
											__mem.check();
											__argv.forEach(function (arg) {
												__mem.write32(argv_ptrs, argv_buf);
												argv_ptrs += 4;
												argv_buf += __mem.writeStr(argv_buf, arg);
											});

											__mem.write32(argv_ptrs, 0);
											return 0;
										}

										wasi_unstable.random_get = function (buf, buf_len) {
											const data = new Uint8Array(__mem.buffer, buf, buf_len);
											for (let i = 0; i < buf_len; ++i) {
												data[i] = (Math.random() * 256) | 0;
											}
										}

										wasi_unstable.clock_time_get = function (clock_id, precision, time_out) {
											throw new Error('wasi_unstable clock_time_get');
										}

										wasi_unstable.poll_oneoff = function (in_ptr, out_ptr, nsubscriptions, nevents_out) {
											throw new Error('wasi_unstable poll_oneoff');
										}

										wbuild.env = {
											printf: function (args) {
												console.log(args);
											}
										};

										function run(module, memfs, args) {
											__argv = args;
											console.log("clang", args.join(" "));
											return new Promise(function (completed, reject) {

												WebAssembly.instantiate(module, { wasi_unstable: wasi_unstable, env: wbuild.env }).then(function (instance) {


													__instance = instance;
													__exports = instance.exports;
													__mem = new memory(__exports.memory);
													memfs.hostMem_ = __mem;
													try {
														__exports._start();
														completed();
													}
													catch (ee) {
														if (ee.message.indexOf("abort:0") > -1) {
															completed();
														}
														else {
															reject(memfs.host_writes);

														}
													}




												})


											});
										}



										function find_exports(txt, args) {
											RG(txt.match(/WASM_EXPORT.*\(/g), function (m) {
												if (m.indexOf("__attribute__") > 0) return;
												m = m.replace(/\(/g, '').trim().split(" ").pop().trim();
												if (m !== "_Pragma" && m.indexOf("__attribute__") < 0) {
													args.push('--export=' + m);
												}
											});

										}

										function find_extern(txt, externs) {
											RG(txt.match(/EXTERN .*\(/g), function (m) {
												m = m.replace(/\(/g, '').trim().split(" ").pop().trim();
												externs.push(m);
											});

										}
										function find_jscript(text) {
											let i1 = text.indexOf("<script>");
											let i2, code = "";
											while (i1 > 0) {
												i2 = text.indexOf("</script>", i1);
												code += ('(function(){' + text.substr(i1, (i2 - i1)).replace("<script>", "").trim() + '})();') + '\n';
												//text = text.replace(code, "");
												i1 = text.indexOf("<script>", i2);
												//	console.log(code);
											}
											//(function () { })();
											return code;

										}
										function process(source, linkoptions, mem_fs, completed, reject) {


											Object.assign(wasi_unstable, mem_fs.exports);


											mem_fs.addFile("main.cpp", source);
											mem_fs.host_writes = "";

											run(clang, mem_fs, [
												'clang',
												'-cc1',
												'-emit-obj',
												'-CC', '-H',
												'-isysroot', '/',
												'-internal-isystem', '/include/c++/v1',
												'-internal-isystem', '/include',
												'-internal-isystem', '/lib/clang/8.0.1/include',
												//'-target-feature +bulk-memory',
												//'-mbulk-memory',
												//'-ferror-limit', '19', '-fmessage-length', '80',
												'-O3',
												'-o',
												'main.o',
												'-x', 'c++', 'main.cpp'
											]).then(
												function () {
													let args = [
														'wasm-ld',
														'--no-threads',
														'--no-entry',
														'-allow-undefined',
														'-z'

													];


													/*
													 'stack-size=' + (256 * 256),
														'--import-memory',
														'--shared-memory',
														'--max-memory=2130706432', 
													 
													 */


													linkoptions.forEach(function (l) {
														args.push(l);
													});

													args.push('-Llib/wasm32-wasi',
														'main.o', '-lc',
														'-lc++', '-lc++abi',
														'-o', 'main.wasm');


													let env = find_jscript(source);
													const externs = [];

													find_exports(source, args);
													find_extern(source, externs);


													let includes = {};
													RG(mem_fs.host_writes.match(/(\/lib\/.*\n)|(\/include\/.*\n)/g), function (m) {
														m = m.trim().replace("/", "");
														if (!includes[m]) {
															includes[m] = true;
															m = mem_fs.get_file_text(m);
															find_exports(m, args);
															find_extern(m, args);
															env += find_jscript(m);

														}
													});

													run(lld, mem_fs, args).then(function () {
														let data = mem_fs.getFileContents("main.wasm");
														env = env.trim() || '';

														env += '\nenv["externs"]=' + JSON.stringify(externs) + ';';



														
														if (env.length > 0) {
															let data2 = new Uint8Array(data.length + env.length + 8);


															str_uint8(env, 0, data2.buffer, 8);
															(new Uint8Array(data2.buffer, env.length + 8, data.length)).set(data);

															let benv = (new Uint32Array(data2.buffer, 0, 2));
															benv[0] = 1111;
															benv[1] = env.length;

															data = data2;
														}

														completed(data);
														is_busy = false;
														if (_queue.length > 0) {
															process.apply(wbuild, _queue.pos());
														}
													}).catch(reject);
												}).catch(reject);

										}




										return function (source, linkoptions, mem_fs) {
											mem_fs = mem_fs || wbuild.default_memfs;
											return new Promise(function (completed, reject) {
												if (is_busy) {
													_queue.unshift([source, linkoptions, mem_fs, completed, reject]);
													return;
												}
												process(source, linkoptions, mem_fs, completed, reject);

											});
										};


									})();
									wbuild.create_memfs().then(function (memfs) {
										wbuild.default_memfs = memfs;
										wbuild_loaded();
									});
								});
						})

					};
					wbuild.get_portable_instance = (function () {
						function wasm_memory(memory) {
							this.memory = memory;
							this.buffer = memory.buffer;
							this.u8 = new Uint8Array(this.memory.buffer);
							this.u32 = new Uint32Array(this.memory.buffer);
							this.f32 = new Float32Array(this.memory.buffer);

							this.check = function check() {
								if (this.buffer.byteLength === 0) {
									this.buffer = this.memory.buffer;
									this.u8 = new Uint8Array(this.buffer);
									this.u32 = new Uint32Array(this.buffer);
									this.f32 = new Float32Array(this.buffer);
								}
							};
							this.read8 = function read8(o) {
								return this.u8[o];
							};
							this.read32 = function read32(o) {
								return this.u32[o >> 2];
							};
							this.readf32 = function readf32(o) {
								return this.f32[o >> 2];
							};
							this.write8 = function write8(o, v) {
								this.u8[o] = v;
							};
							this.write32 = function write32(o, v) {
								this.u32[o >> 2] = v;
							};
							this.write64 = function write64(o, vlo, vhi) {
								if (vhi === void 0) {
									vhi = 0;
								}
								this.write32(o, vlo);
								this.write32(o + 4, vhi);
							};
							function readStr(u8, o, len = -1) {
								let str = '';
								let end = u8.length;
								if (len != -1)
									end = o + len;
								for (let i = o; i < end && u8[i] != 0; ++i)
									str += String.fromCharCode(u8[i]);
								return str;
							}
							this.readStr = (function (_readStr) {
								function readStr(_x, _x2) {
									return _readStr.apply(this, arguments);
								}
								readStr.toString = function () {
									return _readStr.toString();
								};
								return readStr;
							})(
								function (o, len) {
									return readStr(this.u8, o, len);
								}
							);
							this.writeStr = function writeStr(o, str) {
								o += this.write(o, str);
								this.write8(o, 0);
								return str.length + 1;
							};
							this.write = function write(o, buf) {
								if (buf instanceof ArrayBuffer) {
									return this.write(o, new Uint8Array(buf));
								} else if (typeof buf === "string") {
									return this.write(
										o,
										buf.split("").map(function (x) {
											return x.charCodeAt(0);
										})
									);
								} else {
									let dst = new Uint8Array(this.buffer, o, buf.length);
									dst.set(buf);
									return buf.length;
								}
							};

							return this;

						}
						wbuild.get_portable_instance_string = function (data) {
							let benv = (new Uint32Array(data.buffer, 0, 2));
							let env_str = "";
							if (benv[0] === 1111) {
								env_str = array_to_text(new Uint8Array(data.buffer, 8, benv[1])).trim();
								console.log("env_str", env_str);
								data = new Uint8Array(data.buffer, benv[1] + 8, data.length - (benv[1] + 8));
							}


							return (

								function wasm(_env, _wasi_unstable) {
									let wasm_memory = [wasm_memory]
									let i;

									let wa_bytes;
									let wa_text = "[wa]";
									if (typeof atob === 'undefined') {
										wa_bytes = new Uint8Array(Buffer.from(wa_text, 'base64').buffer);
									}
									else {
										const wa_string = atob(wa_text);
										wa_bytes = new Uint8Array(wa_string.length);
										for (i = 0; i < wa_string.length; i++) {
											wa_bytes[i] = wa_string.charCodeAt(i);
										}
									}



									let wasi_unstable = {};
									wasi_unstable.fd_close = wasi_unstable.fd_write = wasi_unstable.fd_seek = function () { };
									let env = {};
									env_overrides();
									if (_env) {
										Object.assign(env, _env);
									}
									if (_wasi_unstable) {
										Object.assign(wasi_unstable, _wasi_unstable);
									}

									if (env['externs']) {
										env['externs'].forEach(function (w) {
											if (!env[w]) {
												function ex_call () {
													if (env[w] && env[w] != ex_call) env[w].apply(env, arguments);
												}
												env[w] = ex_call;
                      }
											
										});
									}

									
									env.wacos = Math.acos;
									env.wabs = Math.abs;
									env.wsin = Math.sin;
									env.wcos = Math.cos;
									env.wtan = Math.tan;
									env.wpow = Math.pow;
									env.wmaxf = env.wmax = Math.max;
									env.wminf = env.wmin = Math.min;
									env.watan2 = Math.atan2;
									env.wsqrt = Math.sqrt;
									env.wfloor = Math.floor;
									env.print_call = function (txt, size) {
										env.wa.memory.check();
										const s = env.wa.memory.readStr(txt, size);
										console.log(s);
									};
									env.params_calls = {};
									env.params_call = function (id, txt, size) {
										env.wa.memory.check();
										const s = env.wa.memory.readStr(txt, size);
										env.params_calls[id] = s;
									};
									return new Promise(function (resolve) {
										WebAssembly.instantiate(wa_bytes, {
											wasi_unstable: wasi_unstable,
											env: env
										}).then(function (instance) {
											if (instance.instance.exports.memory) {
												instance.instance.memory = new wasm_memory(instance.instance.exports.memory);
											}
											else {
												instance.instance.memory = new wasm_memory(env.memory);
											}

											env.memory = instance.instance.memory;
											env.wa = instance.instance;
											resolve(env);
										});

									});



								}).toString()
								.replace("[wa]", array_buffer_to_b64(data))
								.replace("env_overrides();", env_str)
								.replace("[wasm_memory]", wasm_memory.toString());


						}
						return function (data, _env, _wasi_unstable) {
							return new Promise(function (resolve) {

								resolve(function (_env) {
									return new Promise(function (resolve) {

										let benv = (new Uint32Array(data.buffer, 0, 2));
										let env = {};
										let wasi_unstable = {};
										wasi_unstable.fd_close = wasi_unstable.fd_write = wasi_unstable.fd_seek = function () { };
										if (benv[0] === 1111) {
											let env_str = array_to_text(new Uint8Array(data.buffer, 8, benv[1])).trim();
											data = new Uint8Array(data.buffer, benv[1] + 8, data.length - (benv[1] + 8));
											(new Function('env', 'wasi_unstable', env_str))(env, wasi_unstable);
										}
										//[env]
										if (_env) {
											Object.assign(env, _env);
										}
										if (_wasi_unstable) {
											Object.assign(wasi_unstable, _wasi_unstable);
										}

										WebAssembly.instantiate(data, {
											wasi_unstable: wasi_unstable,
											env: env
										}).then(function (instance) {
											instance.instance.memory = new wasm_memory(instance.instance.exports.memory);
											env.memory = instance.instance.memory;
											env.wa = instance.instance;
											resolve(env);
										});
									})

								})




							});
						}
					})();

					wbuild.compile = function (source, linkoptions, mfs) {
					
						
						return new Promise(function (resolve) {
							wbuild.compile_wasm(source, linkoptions, mfs)
								.then(function (data) {
									
									resolve(wbuild.get_portable_instance_string(data));


								}).catch(function (err) {
									console.log(source);
									throw err;
								});

						});
					};


					wbuild.compile_ccp = (function () {
						let i1, i2 = 0, i3 = 0, i4 = 0, code2, linker, mfs, csource, comp;
						return function (session, code) {
						
							return new Promise(function (resolve) {
								//resolve("length "+code.length);return;
								linker = "";
								mfs = "";

								const jscompile = code.match(/\@JSC[\s\S]*?JSC\@/g);
								if (jscompile) {
									let jsc;
									jscompile.forEach(function (c, i) {
										jsc = c.replace("@JSC", "").replace("JSC@", "").trim();
										code = code.replace(c, (new Function("session", 'return (function(){' + jsc + '})()'))(session));
									});
								}
								
								






								i2 = code.search(/@LINK.*\[/);
								if (i2 > -1) {
									linker = code.substr(i2, (code.indexOf("]", i2) - i2) + 1);
								}
								i2 = code.indexOf("<mfs>");
								if (i2 > -1) {
									mfs = code.substr(i2, (code.indexOf("</mfs>", i2) - i2) + 7);
								}


								code2 = code;
								i3 = code2.search(/function.*cpp_compiler.*\(/);
								const compilers = [];
								while (i3 > 0) {
									i4 = code2.indexOf("{", i3);
									i4 = trace_brackets3(code2, i4 + 1);
									comp = code2.substr(i3, (i4 - i3) + 1);
									code2 = code2.replace(comp, "");
									i3 = code2.search(/function.*cpp_compiler.*\(/);
									compilers.push((new Function('RG', 'return ' + comp))(RG));

								}

								//onsole.log(compilers);

								csource = code2.replace(linker, "").replace(mfs, "");

								compilers.forEach(function (cc) {
									csource = cc(csource);
								})



								linker = linker.length > 0 ? (new Function("return " + linker.replace("@LINK", ""))()) : []

								//console.log(csource);

								if (mfs.length > 0) {
									wbuild.create_memfs((new Function("return (" + mfs.replace("<mfs>", "").replace("</mfs>", "") + ")"))()).then(function (mfs) {
										wbuild.compile(csource, linker, mfs).then(function (compiled) {
											resolve(compiled);
										})
									});
								}
								else {
									wbuild.compile(csource, linker, undefined).then(function (compiled) {
										resolve(compiled);
									})
								}
							})
						}

					})();


					return wbuild;

				})().then(function (wasm) {

					wasm.wbuild.load().then(function () {
						entry.get_super_entry().wbuild = wasm.wbuild;
						console.log("wasm in backend", [wasm, entry]);
						wasm_loaded();
					});
				});
			})
		})("wasm", function () {
			console.log("wasm in frontend", [this]);



		});
	});

	packing.register("dom.file_browser", function () {

		packing("dom", "events", "httprequest", "hash_str")("dom.file_browser", function (dom, httprequest, hash_str) {
			
			dom.css(`
.filebrowser {overflow-x:hidden;overflow-y:auto;height:calc(100% - 5px);}

.filebrowser li {width:auto;display:block;min-width:100px;max-width:300px;overflow:hidden;}
.filebrowser .folder-file {font-size:80%;padding:3px;width:120px;}
.filebrowser li.folder-node {max-width:unset;width:100%;}
.filebrowser .folder-file > img{width:120px;height:120px;}
.filebrowser .folder > img{width:220px;height:220px;pointer-events:none; }
.img_input {
             width:120px;
             height:120px;
             border:solid 1px gray;
           }

`)
			function open_path(bro, path, node) {


				httprequest.cmdline('dir /ad /b ' + path).then(function (folders) {
					folders.split('\r\n').forEach(f => {
						if (f == "." || f == ".." || f.length < 1) return undefined;
						return node.appendChild(dom.$.treenode({ path: path + f + "\\" },
							function create11(dv) {
								dv.onclick = function (e) {
									if (!dv.loaded) {
										dv.loaded = true;
										open_path(bro, dv.path, dv.parentNode.querySelector("ul"));
									}

								};
							}, bro.folder_name(f), dom.$.ul()));
					});
					let file, ext;
					httprequest.cmdline('dir /a-d /b /o:n ' + path).then(function (files) {
						files.split('\r\n').forEach(f => {
							if (f == ".." || f.length < 1) return;

							file = bro.create_file_item(path, f);

							if (file) {
								file.folder = node;
								node.files = node.files || [];
								node.files.push(file);

								node.appendChild(dom.$.treenode({ class$: "folder-file", $file: (path + f), path: path + f }, file))

							};

						});


						if (bro.path_loaded) bro.path_loaded(path);

					});

				});




			}

			function create_file_item(path, f) {


				if (!this.valid_file(f, path)) {
					return false;
				}

				if (f.indexOf(".jpg") > 0 || f.indexOf(".png") > 0 || f.indexOf(".gif") > 0) {


					const m = dom.$.img({
						class$: "folder-file",
						path: path + f,
						$hash: hash_str(path + f),
						$title: f,
						filename: f,
						src: "/get?" + encodeURIComponent(path + f),
						loading: "lazy",
						url: "/get?" + encodeURIComponent(path + f)
					});
					return m;
				}
				return f;
			}
			function file_browser() {

				const tv = dom.$.treeview();
				tv.valid_file = /.*/gi;
				tv.create_file_item = create_file_item;
				tv.folder_name = function (f) {
					return f;
				}
				tv.valid_file = function (f, path) {
					return true;
				};
				dom.component(tv, arguments);
				tv.classList.add("filebrowser");




				tv.addEventListener("click", function (e) {
					const dv = e.target;
					console.log("dv", dv);
					if (e.target.classList.contains("folder-file")) {
						if (tv.file_clicked) tv.file_clicked(e.target.path, e.target, e);
					}
					else if (e.target.classList.contains("folder")) {


						if (!dv.loaded) {
							dv.loaded = true;
							open_path(tv, dv.path, dv.parentNode.querySelector("ul"));
						}
					}

				});

				tv.addEventListener("mousedown", function (e) {
					if (e.target.classList.contains("folder-file")) {
						dom.drag_elm_start(e.target, { "fileurl": "/get?" + encodeURIComponent(e.target.path), hash: e.target.getAttribute("hash") });
						//	e.target.setAttribute("draggable", "true");
						//	e.target.ondragstart = ondragstart;
						//if (tv.file_clicked) tv.file_clicked(e.target.path, e.target, e);
					}

				});

				if (tv.path) {
					open_path(tv, tv.path, tv);
				}
				return tv;
			}

			file_browser.get_folder_files = function (path) {
				return new Promise(function (res) {
					const ff = [];
					cmdline('dir /a-d /b /o:n ' + path).then(function (files) {
						files.split('\r\n').forEach(f => {
							if (f == ".." || f.length < 1) return;
							ff.push(path + f);
						});
						res(ff);
					})
				});

			};

			dom.components["file_browser"] = file_browser;




		});

	});

	packing.register("binary_pack", function () {

		packing()("binary_pack", function () {
			/*
BPAK - minimal binary asset pack format.

Layout (all integers little-endian):
	[0]  4 bytes   magic "BPAK"
	[4]  uint16    version
	[6]  uint16    flags (reserved, 0)
	[8]  uint32    entry count
	[12] uint32    toc size in bytes (not including this 16-byte header)
	[16] ...       TOC: for each entry, in order:
									 uint16 nameLen
									 nameLen bytes  name (UTF-8)
									 uint32 dataOffset (relative to start of data section)
									 uint32 dataLength
	[16+tocSize]   data section: every entry's raw bytes, concatenated in TOC order

No per-entry compression or checksum - entries here are already-compressed
image formats (jpg/png/webp), so there is nothing to gain from deflating
them again, and skipping CRC computation keeps both write() and read() a
single linear pass. version/flags are reserved so a future revision (e.g.
optional per-entry checksum, or a compression flag) can be added without
breaking readers that only understand the fields they need.

Vanilla ES5 (var/function only, no let/const/arrow/template
literals/classes) so this file can be dropped as-is into a JS runtime
that doesn't support newer syntax. Uses ArrayBuffer/Uint8Array/DataView -
these are the standard binary primitives in JS engines and are what makes
read() zero-copy (subarray() is a view, not a copy).
*/

			/*
BPAK - minimal binary asset pack format.

Layout (all integers little-endian):
	[0]  4 bytes   magic "BPAK"
	[4]  uint16    version
	[6]  uint16    flags (reserved, 0)
	[8]  uint32    entry count
	[12] uint32    toc size in bytes (not including this 16-byte header)
	[16] ...       TOC: for each entry, in order:
									 uint16 nameLen
									 nameLen bytes  name (UTF-8)
									 uint32 dataOffset (relative to start of data section)
									 uint32 dataLength
	[16+tocSize]   data section: every entry's raw bytes, concatenated in TOC order

No per-entry compression or checksum - entries here are already-compressed
image formats (jpg/png/webp), so there is nothing to gain from deflating
them again, and skipping CRC computation keeps both write() and read() a
single linear pass. version/flags are reserved so a future revision (e.g.
optional per-entry checksum, or a compression flag) can be added without
breaking readers that only understand the fields they need.

Vanilla ES5 (var/function only, no let/const/arrow/template
literals/classes) so this file can be dropped as-is into a JS runtime
that doesn't support newer syntax. Uses ArrayBuffer/Uint8Array/DataView -
these are the standard binary primitives in JS engines and are what makes
read() zero-copy (subarray() is a view, not a copy).
*/
			const  BPAK = (function () {
				'use strict';

				let MAGIC = [0x42, 0x50, 0x41, 0x4B]; // "BPAK"
				let VERSION = 1;
				let HEADER_SIZE = 16;

				function utf8Encode(str) {
					let bytes = [];
					let i, code, next, codepoint;
					for (i = 0; i < str.length; i++) {
						code = str.charCodeAt(i);
						if (code < 0x80) {
							bytes.push(code);
						} else if (code < 0x800) {
							bytes.push(0xC0 | (code >> 6));
							bytes.push(0x80 | (code & 0x3F));
						} else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
							next = str.charCodeAt(i + 1);
							codepoint = ((code - 0xD800) << 10) + (next - 0xDC00) + 0x10000;
							i += 1;
							bytes.push(0xF0 | (codepoint >> 18));
							bytes.push(0x80 | ((codepoint >> 12) & 0x3F));
							bytes.push(0x80 | ((codepoint >> 6) & 0x3F));
							bytes.push(0x80 | (codepoint & 0x3F));
						} else {
							bytes.push(0xE0 | (code >> 12));
							bytes.push(0x80 | ((code >> 6) & 0x3F));
							bytes.push(0x80 | (code & 0x3F));
						}
					}
					return bytes;
				}

				function utf8Decode(bytes, offset, length) {
					let out = '';
					let end = offset + length;
					let i = offset;
					let b0, c1, c2, cp;
					while (i < end) {
						b0 = bytes[i];
						if (b0 < 0x80) {
							out += String.fromCharCode(b0);
							i += 1;
						} else if ((b0 & 0xE0) === 0xC0) {
							c1 = ((b0 & 0x1F) << 6) | (bytes[i + 1] & 0x3F);
							out += String.fromCharCode(c1);
							i += 2;
						} else if ((b0 & 0xF0) === 0xE0) {
							c2 = ((b0 & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F);
							out += String.fromCharCode(c2);
							i += 3;
						} else {
							cp = ((b0 & 0x07) << 18) | ((bytes[i + 1] & 0x3F) << 12) | ((bytes[i + 2] & 0x3F) << 6) | (bytes[i + 3] & 0x3F);
							cp -= 0x10000;
							out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
							i += 4;
						}
					}
					return out;
				}

				// files: array of {name: string, data: Uint8Array}. Returns a Uint8Array.
				function write(files) {
					let count = files.length;
					let i, n;
					let nameByteArrays = new Array(count);
					let tocSize = 0;

					for (i = 0; i < count; i++) {
						let nameBytes = utf8Encode(files[i].name);
						nameByteArrays[i] = nameBytes;
						tocSize += 2 + nameBytes.length + 4 + 4;
					}

					let dataSize = 0;
					for (i = 0; i < count; i++) {
						dataSize += files[i].data.length;
					}

					let totalSize = HEADER_SIZE + tocSize + dataSize;
					let buffer = new ArrayBuffer(totalSize);
					let bytes = new Uint8Array(buffer);
					let view = new DataView(buffer);

					bytes[0] = MAGIC[0];
					bytes[1] = MAGIC[1];
					bytes[2] = MAGIC[2];
					bytes[3] = MAGIC[3];
					view.setUint16(4, VERSION, true);
					view.setUint16(6, 0, true);
					view.setUint32(8, count, true);
					view.setUint32(12, tocSize, true);

					let tocPos = HEADER_SIZE;
					let dataSectionStart = HEADER_SIZE + tocSize;
					let dataCursor = 0;

					for (i = 0; i < count; i++) {
						let nb = nameByteArrays[i];
						view.setUint16(tocPos, nb.length, true);
						tocPos += 2;
						for (n = 0; n < nb.length; n++) {
							bytes[tocPos + n] = nb[n];
						}
						tocPos += nb.length;

						let entryData = files[i].data;
						view.setUint32(tocPos, dataCursor, true);
						tocPos += 4;
						view.setUint32(tocPos, entryData.length, true);
						tocPos += 4;

						bytes.set(entryData, dataSectionStart + dataCursor);
						dataCursor += entryData.length;
					}

					return bytes;
				}

				// buffer: ArrayBuffer or Uint8Array. Returns {get(name), list(), count, version}.
				// get() returns a zero-copy Uint8Array view into the original buffer, or null.
				function read(buffer) {
					let bytes = (buffer instanceof Uint8Array) ? buffer : new Uint8Array(buffer);
					let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

					if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1] || bytes[2] !== MAGIC[2] || bytes[3] !== MAGIC[3]) {
						throw new Error('BPAK: bad magic');
					}
					let version = view.getUint16(4, true);
					if (version !== VERSION) {
						throw new Error('BPAK: unsupported version ' + version);
					}
					let count = view.getUint32(8, true);
					let tocSize = view.getUint32(12, true);
					let dataSectionStart = HEADER_SIZE + tocSize;

					let index = {};
					let order = new Array(count);
					let pos = HEADER_SIZE;
					let i, nameLen, name, offset, length, entry;

					for (i = 0; i < count; i++) {
						nameLen = view.getUint16(pos, true);
						pos += 2;
						name = utf8Decode(bytes, pos, nameLen);
						pos += nameLen;
						offset = view.getUint32(pos, true);
						pos += 4;
						length = view.getUint32(pos, true);
						pos += 4;

						entry = { name: name, offset: offset, length: length };
						index[name] = entry;
						order[i] = entry;
					}

					function get(name) {
						let e = index[name];
						if (!e) return null;
						return bytes.subarray(dataSectionStart + e.offset, dataSectionStart + e.offset + e.length);
					}

					function list() {
						let names = new Array(order.length);
						for (let j = 0; j < order.length; j++) {
							names[j] = order[j].name;
						}
						return names;
					}

					return { get: get, list: list, count: count, version: version };
				}

				// Folders are not a format feature - an entry name is just a '/'-separated
				// path (same convention as zip/tar). buildTree() turns a flat name list
				// into a nested {type:'dir'|'file', ...} tree so callers (a viewer, an
				// engine's asset browser) don't each reimplement path splitting. An entry
				// whose name ends in '/' is an explicit empty-directory marker (usually
				// zero-length data) rather than a file leaf.
				function buildTree(names) {
					let root = { type: 'dir', name: '', path: '', children: {} };
					let i, raw, isDirMarker, parts, node, pathSoFar, p, part, isLastPart;

					for (i = 0; i < names.length; i++) {
						raw = names[i];
						isDirMarker = raw.charAt(raw.length - 1) === '/';
						parts = raw.split('/');
						if (isDirMarker) {
							parts.pop();
						}

						node = root;
						pathSoFar = '';
						for (p = 0; p < parts.length; p++) {
							part = parts[p];
							if (part === '') continue;
							pathSoFar = pathSoFar ? pathSoFar + '/' + part : part;
							isLastPart = (p === parts.length - 1);

							if (isLastPart && !isDirMarker) {
								node.children[part] = { type: 'file', name: part, path: pathSoFar, fullName: raw };
							} else {
								if (!node.children[part] || node.children[part].type !== 'dir') {
									node.children[part] = { type: 'dir', name: part, path: pathSoFar, children: {} };
								}
								node = node.children[part];
							}
						}
					}
					return root;
				}

				// Mutable pack: add/remove entries, then build() into pack bytes.
				// fromPack()/fromBuffer() seed a Builder from an existing pack so it can
				// be edited and re-saved without touching entries you don't change -
				// seeded entries are the zero-copy views read() already returned, so
				// nothing is copied until build() assembles the final buffer.
				function Builder() {
					this._entries = {};
					this._order = [];
				}

				Builder.prototype.add = function (name, data) {
					if (!Object.prototype.hasOwnProperty.call(this._entries, name)) {
						this._order.push(name);
					}
					this._entries[name] = data;
				};

				Builder.prototype.remove = function (name) {
					if (Object.prototype.hasOwnProperty.call(this._entries, name)) {
						delete this._entries[name];
						let idx = this._order.indexOf(name);
						if (idx !== -1) this._order.splice(idx, 1);
						return true;
					}
					return false;
				};

				// Removes name itself plus every entry under it as a folder (name + '/' prefix).
				// Returns the list of removed names.
				Builder.prototype.removeTree = function (name) {
					let prefix = name.charAt(name.length - 1) === '/' ? name : name + '/';
					let removed = [];
					let names = this.list();
					for (let i = 0; i < names.length; i++) {
						let n = names[i];
						if (n === name || n === prefix || n.indexOf(prefix) === 0) {
							this.remove(n);
							removed.push(n);
						}
					}
					return removed;
				};

				Builder.prototype.has = function (name) {
					return Object.prototype.hasOwnProperty.call(this._entries, name);
				};

				Builder.prototype.get = function (name) {
					return this.has(name) ? this._entries[name] : null;
				};

				Builder.prototype.list = function () {
					return this._order.slice();
				};

				Builder.prototype.build = function () {
					let files = new Array(this._order.length);
					for (let i = 0; i < this._order.length; i++) {
						files[i] = { name: this._order[i], data: this._entries[this._order[i]] };
					}
					return write(files);
				};

				Builder.fromPack = function (pack) {
					let b = new Builder();
					let names = pack.list();
					for (let i = 0; i < names.length; i++) {
						b.add(names[i], pack.get(names[i]));
					}
					return b;
				};

				Builder.fromBuffer = function (buffer) {
					return Builder.fromPack(read(buffer));
				};

				return { write: write, read: read, buildTree: buildTree, Builder: Builder, VERSION: VERSION };
			})();


			Object.assign(this, BPAK);
			return this;

		});
	});


	packing.register("json_bin", function () {

		packing()("json_bin", function () {
			const bag = (function () {


				const str_uint8 = (function () {
					const lenu32 = new Uint16Array(1);
					const lenu8 = new Uint8Array(lenu32.buffer);
					return function (str, store_length) {
						let arr, i = 0;

						if (store_length) {
							lenu32[0] = str.length;
							arr = new Uint8Array(str.length + 2);
							arr[i++] = lenu8[0];
							arr[i++] = lenu8[1];
						}
						else {
							arr = new Uint8Array(str.length);
						}
						while (i < str.length) {
							arr[i] = str.charCodeAt(i++);
						}

						return arr;
					};

				})();


				let bi = 0, spoi, rsize, buffer = new Uint8Array(2);
				let buffer_orig = buffer, data_length = 0;

				const pointer = new Uint32Array(1);
				const pointer_bytes = new Uint8Array(pointer.buffer);
				function add_pointer(value) {
					const poi = bi;
					pointer[0] = value;
					buffer[bi++] = pointer_bytes[0];
					buffer[bi++] = pointer_bytes[1];
					buffer[bi++] = pointer_bytes[2];
					buffer[bi++] = pointer_bytes[3];


					return poi;
				}
				function set_pointer(poi, value) {
					pointer[0] = value;
					buffer[poi++] = pointer_bytes[0];
					buffer[poi++] = pointer_bytes[1];
					buffer[poi++] = pointer_bytes[2];
					buffer[poi++] = pointer_bytes[3];
				}
				function get_pointer(poi) {
					pointer_bytes[0] = buffer[poi++];
					pointer_bytes[1] = buffer[poi++];
					pointer_bytes[2] = buffer[poi++];
					pointer_bytes[3] = buffer[poi++];
					return pointer[0];
				}

				function read_text(poi) {
					return uint8_str(new Uint8Array(buffer.buffer, poi + 4, get_pointer(poi)));
				};

				function read_uint8(poi) {
					const arr = new Uint8Array(get_pointer(poi));
					arr.set(new Uint8Array(buffer.buffer, poi + 4, arr.length));
					return arr

				};

				function read_float32(poi) {
					return new Float32Array(read_uint8(poi).buffer);
				};
				const uint8_str = function (arr) {
					let m = "";
					for (let i = 0; i < arr.length; i++) {
						m += String.fromCharCode(arr[i]);
					}
					return m;
				};


				function add_data(data, length) {
					data = new Uint8Array(data);
					data_length = length || data.length;
					const poi = add_pointer(data_length);
					for (let i = 0; i < data_length; i++)
						buffer[bi++] = data[i];
					return poi;
				}
				const bag = {};


				bag.data_length = function () {
					return data_length;
				};

				bag.read_uint8 = read_uint8;
				bag.read_text = read_text;
				bag.read_float32 = read_float32;

				bag.load_bin = function (buff) {
					buffer = buff;
					spoi = get_pointer(0);
					console.log("size", (buffer.length / 1024 / 1024).toFixed(2) + " mb");
					return this;
				};


				bag.create_loader = function (buff) {

					if (Object.prototype.toString.call(buff) === "[object String]") {
						buff = str_uint8(atob(buff)).buffer;
					}

					const bag = {};
					let buffer, spoi = 0, offset = 0;

					bag.load_buffer = function (buff) {
						buffer = new Uint8Array(buff);
						spoi = 0;
						offset = 0;
						if (buffer[0] == 255 && buffer[1] == 216 && buffer[2] == 255 && buffer[3] == 224) {
							pointer_bytes[0] = buffer[buffer.length - 4];
							pointer_bytes[1] = buffer[buffer.length - 3];
							pointer_bytes[2] = buffer[buffer.length - 2];
							pointer_bytes[3] = buffer[buffer.length - 1];
							offset = pointer[0];
							//spoi = offset;
							console.log(offset, pointer_bytes);

						}

						spoi = get_pointer(offset);
					};



					function get_pointer(poi) {
						pointer_bytes[0] = buffer[poi++];
						pointer_bytes[1] = buffer[poi++];
						pointer_bytes[2] = buffer[poi++];
						pointer_bytes[3] = buffer[poi++];
						return pointer[0];
					}



					function read_text(poi) {
						poi += offset;
						return uint8_str(new Uint8Array(buffer.buffer, poi + 4, get_pointer(poi)));
					};


					function read_uint8(poi) {
						poi += offset;
						const arr = new Uint8Array(get_pointer(poi));
						arr.set(new Uint8Array(buffer.buffer, poi + 4, arr.length));
						return arr;
					};

					function read_float32(poi) {
						poi += offset;
						return new Float32Array(buffer.buffer, poi + 4, get_pointer(poi) / 4);
						//return new Float32Array(read_uint8(poi).buffer);
					};

					function read_uint32(poi) {
						poi += offset;
						return new Uint32Array(buffer.buffer, poi + 4, get_pointer(poi) / 4);
					};

					function read_uint16(poi) {
						poi += offset;
						return new Uint16Array(buffer.buffer, poi + 4, get_pointer(poi) / 2);
					};

					bag.read_uint8 = read_uint8;
					bag.read_text = read_text;
					bag.read_uint16 = read_uint16;
					bag.read_uint32 = read_uint32;
					bag.read_float32 = read_float32;

					bag.read_info_json = function () {
						return JSON.parse(decodeURIComponent(read_text(spoi)));
					};

					if (buff) bag.load_buffer(buff);
					return bag;

				};
				bag.create_loader_function = function (buff) {
					const bag = this.create_loader(buff);
					const J = bag.read_info_json();
					return function (func) {
						return func(J, bag);
					}
				};


				bag.read_info_json = function () {
					return JSON.parse(decodeURIComponent(read_text(spoi)));
				};

				bag.add_data = function (data, length) {
					return add_data(data, length);
				};

				bag.add_info_json = function (info) {
					set_pointer(spoi, add_data(str_uint8(encodeURIComponent(JSON.stringify(info)))));
					return this;
				};

				bag.get_bin = function (pad) {
					return new Uint8Array(buffer.buffer, 0, bi + (bi % (pad || 1)));
				};

				bag.get_blob_with_thumb = function (pad, thumb) {
					thumb = new Uint8Array(thumb);
					pointer[0] = thumb.length;
					console.log("thumb.length", thumb.length);
					const b = new Blob([
						thumb,
						new Uint8Array(buffer.buffer, 0, bi + (bi % (pad || 1))),
						pointer_bytes
					], { type: "image/jpeg" }
					);
					console.log(b);
					return b;
				};

				bag.get_bin_base64 = function (pad) {
					return btoa(uint8_str(new Uint8Array(buffer.buffer, 0, bi + (bi % (pad || 1)))));

				};

				bag.allocate = function (size) {
					bi = 0;
					if (buffer.length < size) {
						buffer = new Uint8Array(size);
					}
					spoi = add_pointer(0);

					return this;
				};

				return bag;




			})();

			return bag;

		});

	});

  return packing;
}



let packing;
if (is_browser) {
	packing = create_packing("");
	console.log("packing", [packing]);
}
else {

	function sleep(ms) {
		return new Promise(function (resolve) { setTimeout(resolve, ms) });
	}
	const is_function = function (obj) {
		return !!(obj && obj.constructor && obj.call && obj.apply);
	};
	const fs = require('fs');
	const child_process = require("child_process");

	const get_bundle = async function (b) {
		if (b.get_bundle) {
			b = await b.get_bundle();
			return b;
		}
		else if (is_function(b)) {
			b = b.toString();
			return b.substr(b.indexOf("{") + 1, (b.length - b.indexOf("{")) - 2).trim();
		}
	}

	function args() {
		if (!process.argv) return {};
		let col = {};
		process.argv.forEach(function (a, i) {
			if (a.charAt(0) === '-') {
				col[a.substr(1, a.length)] = process.argv[i + 1];
			}
		});

		return col;

	};

	let A = args();
	console.log(A);

	let root = process.cwd();

	if (A["root"]) root = A["root"];

	if (A["serve"]) {
		packing = create_packing(root);
		packing("http.basic_server")(function (http) {
		 http.basic_server();
		 return this;
	 }).execute_bundle().then(function (bundle) { });
	}
	else if (A["run"]) {
		packing = create_packing(root);
		eval(require("fs").readFileSync(A["run"], 'utf8'));
	}

	else if (A["bundle"]) {
		const get_bundle = async function (b) {
		
			if (b.get_bundle) {
				
				b = await b.get_bundle();
				return b;
			}
			else if (is_function(b)) {
				b = b.toString();
				return b.substr(b.indexOf("{") + 1, (b.length - b.indexOf("{")) - 2).trim();
			}
		}
		const fil = A["bundle"];
		const fs = require("fs");
		packing = create_packing(root);
		get_bundle(eval(fs.readFileSync(fil, 'utf8'))).then(function (b) {
			fs.writeFileSync(fil + ".bndl.js", b);
		});
	}
}

if (typeof exports !== 'undefined') {
	exports.packing = create_packing;
}