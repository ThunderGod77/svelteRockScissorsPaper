
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Heading.svelte generated by Svelte v3.24.1 */

    const file = "src/Heading.svelte";

    function create_fragment(ctx) {
    	let div2;
    	let div0;
    	let h20;
    	let t1;
    	let h21;
    	let t3;
    	let h22;
    	let t5;
    	let div1;
    	let h3;
    	let t7;
    	let p;
    	let t8;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			h20.textContent = "ROCK";
    			t1 = space();
    			h21 = element("h2");
    			h21.textContent = "PAPER";
    			t3 = space();
    			h22 = element("h2");
    			h22.textContent = "SCISSOR";
    			t5 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Score";
    			t7 = space();
    			p = element("p");
    			t8 = text(/*score*/ ctx[0]);
    			add_location(h20, file, 39, 8, 668);
    			add_location(h21, file, 40, 8, 690);
    			add_location(h22, file, 41, 8, 713);
    			attr_dev(div0, "class", "cont");
    			add_location(div0, file, 38, 4, 641);
    			attr_dev(h3, "class", "svelte-1ud717x");
    			add_location(h3, file, 44, 8, 773);
    			attr_dev(p, "class", "svelte-1ud717x");
    			add_location(p, file, 45, 8, 796);
    			attr_dev(div1, "class", "score svelte-1ud717x");
    			add_location(div1, file, 43, 4, 745);
    			attr_dev(div2, "class", "heading svelte-1ud717x");
    			add_location(div2, file, 37, 0, 615);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h20);
    			append_dev(div0, t1);
    			append_dev(div0, h21);
    			append_dev(div0, t3);
    			append_dev(div0, h22);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t7);
    			append_dev(div1, p);
    			append_dev(p, t8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*score*/ 1) set_data_dev(t8, /*score*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { score } = $$props;
    	const writable_props = ["score"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Heading> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Heading", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("score" in $$props) $$invalidate(0, score = $$props.score);
    	};

    	$$self.$capture_state = () => ({ score });

    	$$self.$inject_state = $$props => {
    		if ("score" in $$props) $$invalidate(0, score = $$props.score);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [score];
    }

    class Heading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { score: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Heading",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*score*/ ctx[0] === undefined && !("score" in props)) {
    			console.warn("<Heading> was created without expected prop 'score'");
    		}
    	}

    	get score() {
    		throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set score(value) {
    		throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ChoosingBody.svelte generated by Svelte v3.24.1 */
    const file$1 = "src/ChoosingBody.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let img2;
    	let img2_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			img2 = element("img");
    			if (img0.src !== (img0_src_value = "images/icon-rock.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "rock");
    			attr_dev(img0, "class", "rock");
    			attr_dev(img0, "width", "160px");
    			attr_dev(img0, "height", "160px");
    			set_style(img0, "margin-top", "100px");
    			set_style(img0, "margin-left", "400px");
    			set_style(img0, "background-color", "#f4f4f4");
    			set_style(img0, "border-radius", "65px");
    			set_style(img0, "padding", "40px");
    			add_location(img0, file$1, 8, 4, 50);
    			if (img1.src !== (img1_src_value = "images/icon-scissors.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "scissors");
    			attr_dev(img1, "class", "rock");
    			attr_dev(img1, "width", "160px");
    			attr_dev(img1, "height", "160px");
    			set_style(img1, "margin-top", "100px");
    			set_style(img1, "margin-left", "700px");
    			set_style(img1, "background-color", "#f4f4f4");
    			set_style(img1, "border-radius", "65px");
    			set_style(img1, "padding", "40px");
    			add_location(img1, file$1, 9, 4, 274);
    			if (img2.src !== (img2_src_value = "images/icon-paper.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "rock");
    			attr_dev(img2, "class", "paper");
    			attr_dev(img2, "width", "160px");
    			attr_dev(img2, "height", "160px");
    			set_style(img2, "margin-left", "850px");
    			set_style(img2, "margin-top", "100px");
    			set_style(img2, "background-color", "#f4f4f4");
    			set_style(img2, "border-radius", "65px");
    			set_style(img2, "padding", "40px");
    			add_location(img2, file$1, 10, 4, 509);
    			attr_dev(div, "class", "container");
    			add_location(div, file$1, 7, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img0);
    			append_dev(div, t0);
    			append_dev(div, img1);
    			append_dev(div, t1);
    			append_dev(div, img2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(img1, "click", /*click_handler_1*/ ctx[2], false, false, false),
    					listen_dev(img2, "click", /*click_handler_2*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	function play(symbol) {
    		dispatch("choose", { symbol });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ChoosingBody> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ChoosingBody", $$slots, []);
    	const click_handler = () => play("rock");
    	const click_handler_1 = () => play("scissors");
    	const click_handler_2 = () => play("paper");
    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch, play });
    	return [play, click_handler, click_handler_1, click_handler_2];
    }

    class ChoosingBody extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChoosingBody",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Footer.svelte generated by Svelte v3.24.1 */

    const file$2 = "src/Footer.svelte";

    function create_fragment$2(ctx) {
    	let footer;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			button = element("button");
    			button.textContent = "Rules";
    			attr_dev(button, "class", "rules svelte-r7tsax");
    			add_location(button, file$2, 15, 4, 238);
    			attr_dev(footer, "class", "svelte-r7tsax");
    			add_location(footer, file$2, 14, 0, 225);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Footer", $$slots, []);
    	const click_handler = () => alert("Rock beats Scissors.\nScissors beat Paper.\nPaper beats Rock.");
    	return [click_handler];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/ResultBody.svelte generated by Svelte v3.24.1 */
    const file$3 = "src/ResultBody.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let h1;
    	let t2;
    	let t3;
    	let h20;
    	let t5;
    	let h21;
    	let t7;
    	let h22;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			h1 = element("h1");
    			t2 = text(/*result*/ ctx[2]);
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "NEXT";
    			t5 = space();
    			h21 = element("h2");
    			h21.textContent = "You";
    			t7 = space();
    			h22 = element("h2");
    			h22.textContent = "Computer";
    			if (img0.src !== (img0_src_value = "images/icon-" + /*player1*/ ctx[0] + ".svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "rock");
    			attr_dev(img0, "class", "rock");
    			attr_dev(img0, "width", "160px");
    			attr_dev(img0, "height", "160px");
    			set_style(img0, "margin-top", "100px");
    			set_style(img0, "margin-left", "400px");
    			set_style(img0, "background-color", "#f4f4f4");
    			set_style(img0, "border-radius", "65px");
    			set_style(img0, "padding", "40px");
    			add_location(img0, file$3, 36, 4, 531);
    			if (img1.src !== (img1_src_value = "images/icon-" + /*player2*/ ctx[1] + ".svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "scissors");
    			attr_dev(img1, "class", "rock");
    			attr_dev(img1, "width", "160px");
    			attr_dev(img1, "height", "160px");
    			set_style(img1, "margin-top", "100px");
    			set_style(img1, "margin-left", "700px");
    			set_style(img1, "background-color", "#f4f4f4");
    			set_style(img1, "border-radius", "65px");
    			set_style(img1, "padding", "40px");
    			add_location(img1, file$3, 37, 4, 737);
    			attr_dev(div, "class", "container");
    			add_location(div, file$3, 35, 0, 503);
    			attr_dev(h1, "class", "svelte-1pcvzg8");
    			add_location(h1, file$3, 39, 0, 949);
    			attr_dev(h20, "class", "pop svelte-1pcvzg8");
    			add_location(h20, file$3, 40, 0, 967);
    			attr_dev(h21, "class", "you svelte-1pcvzg8");
    			add_location(h21, file$3, 43, 0, 1033);
    			attr_dev(h22, "class", "computer svelte-1pcvzg8");
    			add_location(h22, file$3, 44, 0, 1058);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img0);
    			append_dev(div, t0);
    			append_dev(div, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h22, anchor);

    			if (!mounted) {
    				dispose = listen_dev(h20, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*player1*/ 1 && img0.src !== (img0_src_value = "images/icon-" + /*player1*/ ctx[0] + ".svg")) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*player2*/ 2 && img1.src !== (img1_src_value = "images/icon-" + /*player2*/ ctx[1] + ".svg")) {
    				attr_dev(img1, "src", img1_src_value);
    			}

    			if (dirty & /*result*/ 4) set_data_dev(t2, /*result*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(h22);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { player1 } = $$props;
    	let { player2 } = $$props;
    	let { result } = $$props;
    	const dispatch = createEventDispatcher();
    	const writable_props = ["player1", "player2", "result"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ResultBody> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ResultBody", $$slots, []);

    	const click_handler = () => {
    		dispatch("next");
    	};

    	$$self.$$set = $$props => {
    		if ("player1" in $$props) $$invalidate(0, player1 = $$props.player1);
    		if ("player2" in $$props) $$invalidate(1, player2 = $$props.player2);
    		if ("result" in $$props) $$invalidate(2, result = $$props.result);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		player1,
    		player2,
    		result,
    		dispatch
    	});

    	$$self.$inject_state = $$props => {
    		if ("player1" in $$props) $$invalidate(0, player1 = $$props.player1);
    		if ("player2" in $$props) $$invalidate(1, player2 = $$props.player2);
    		if ("result" in $$props) $$invalidate(2, result = $$props.result);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [player1, player2, result, dispatch, click_handler];
    }

    class ResultBody extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { player1: 0, player2: 1, result: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ResultBody",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*player1*/ ctx[0] === undefined && !("player1" in props)) {
    			console.warn("<ResultBody> was created without expected prop 'player1'");
    		}

    		if (/*player2*/ ctx[1] === undefined && !("player2" in props)) {
    			console.warn("<ResultBody> was created without expected prop 'player2'");
    		}

    		if (/*result*/ ctx[2] === undefined && !("result" in props)) {
    			console.warn("<ResultBody> was created without expected prop 'result'");
    		}
    	}

    	get player1() {
    		throw new Error("<ResultBody>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set player1(value) {
    		throw new Error("<ResultBody>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get player2() {
    		throw new Error("<ResultBody>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set player2(value) {
    		throw new Error("<ResultBody>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get result() {
    		throw new Error("<ResultBody>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<ResultBody>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;

    // (48:0) {:else}
    function create_else_block(ctx) {
    	let rbody;
    	let current;

    	rbody = new ResultBody({
    			props: {
    				player1: /*player1*/ ctx[0],
    				player2: /*player2*/ ctx[1],
    				result: /*result*/ ctx[4]
    			},
    			$$inline: true
    		});

    	rbody.$on("next", /*next_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(rbody.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(rbody, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const rbody_changes = {};
    			if (dirty & /*player1*/ 1) rbody_changes.player1 = /*player1*/ ctx[0];
    			if (dirty & /*player2*/ 2) rbody_changes.player2 = /*player2*/ ctx[1];
    			if (dirty & /*result*/ 16) rbody_changes.result = /*result*/ ctx[4];
    			rbody.$set(rbody_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rbody.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rbody.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(rbody, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(48:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (46:0) {#if choosing}
    function create_if_block(ctx) {
    	let cbody;
    	let current;
    	cbody = new ChoosingBody({ $$inline: true });
    	cbody.$on("choose", /*play*/ ctx[5]);

    	const block = {
    		c: function create() {
    			create_component(cbody.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cbody, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cbody.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cbody.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cbody, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(46:0) {#if choosing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let heading;
    	let t0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let footer;
    	let current;

    	heading = new Heading({
    			props: { score: /*score*/ ctx[2] },
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*choosing*/ ctx[3]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(heading.$$.fragment);
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			create_component(footer.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(heading, target, anchor);
    			insert_dev(target, t0, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const heading_changes = {};
    			if (dirty & /*score*/ 4) heading_changes.score = /*score*/ ctx[2];
    			heading.$set(heading_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(t1.parentNode, t1);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(heading.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(heading.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(heading, detaching);
    			if (detaching) detach_dev(t0);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let player1 = "";
    	let player2 = "";
    	let score = 0;
    	let choosing = true;
    	let showResult = false;
    	let result;

    	function play(e) {
    		const symbol = e.detail.symbol;
    		console.log(symbol);
    		let randomNum = Math.floor(Math.random() * 3);
    		randomNum = Math.min(randomNum, 2);
    		let set = ["rock", "paper", "scissors"];
    		let index = set.indexOf(symbol);
    		$$invalidate(1, player2 = set[randomNum]);
    		$$invalidate(0, player1 = set[index]);

    		if (index === randomNum) {
    			$$invalidate(2, score = score + 0);
    			console.log("draw");
    			$$invalidate(3, choosing = false);
    			$$invalidate(4, result = "DRAW");
    		} else if (randomNum === 0 && index === 1 || randomNum === 1 && index === 2 || randomNum === 2 && index === 0) {
    			$$invalidate(2, score = score + 1);
    			console.log("won");
    			$$invalidate(3, choosing = false);
    			$$invalidate(4, result = "WON");
    		} else {
    			$$invalidate(2, score = score - 1);
    			console.log("lose");
    			$$invalidate(3, choosing = false);
    			$$invalidate(4, result = "LOSE");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	const next_handler = () => {
    		$$invalidate(3, choosing = true);
    	};

    	$$self.$capture_state = () => ({
    		Heading,
    		CBody: ChoosingBody,
    		Footer,
    		RBody: ResultBody,
    		player1,
    		player2,
    		score,
    		choosing,
    		showResult,
    		result,
    		play
    	});

    	$$self.$inject_state = $$props => {
    		if ("player1" in $$props) $$invalidate(0, player1 = $$props.player1);
    		if ("player2" in $$props) $$invalidate(1, player2 = $$props.player2);
    		if ("score" in $$props) $$invalidate(2, score = $$props.score);
    		if ("choosing" in $$props) $$invalidate(3, choosing = $$props.choosing);
    		if ("showResult" in $$props) showResult = $$props.showResult;
    		if ("result" in $$props) $$invalidate(4, result = $$props.result);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [player1, player2, score, choosing, result, play, next_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,

    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
