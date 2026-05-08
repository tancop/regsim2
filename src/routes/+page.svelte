<script lang="ts">
    import { State } from "$lib/core";
    import { parseCode, ParseError } from "$lib/parse";
    import { ExternalState } from "$lib/external.svelte";

    const DEFAULT_ASM = `set a 32
inc b
divl a 2
jo 6
cmpl a 1
jne 1
mov b a
set b 0`;

    let isRunning = $state(false);
    let asm = $state(DEFAULT_ASM);
    let codeOutput = $state("...");

    let { code: parsedCode, err: parseError } = $derived.by(() => {
        try {
            return { code: parseCode(asm) };
        } catch (e) {
            return { err: e as ParseError };
        }
    });

    let codeState = $state(new ExternalState<State | undefined>(undefined));

    let lastUopIdx = $state(0);

    let currentIp = $state(-1);
    let lastIp = $state(0);

    let displayedIp = $derived(isRunning ? lastIp : 0);

    let stepTime = $state(10);
    let opsLimit = $state(1000);

    let ops = $derived(asm.split("\n").map((s) => s.replace("\n", "")));

    let editor = $state<HTMLDivElement>();

    let shouldStop = $state(false);

    function handleStep() {
        if (!isRunning && parsedCode) {
            codeState.data = new State(parsedCode);
            lastIp = 0;
        }

        isRunning = true;

        const state = codeState.data!;

        state.stepAll();
        lastUopIdx = state.code[currentIp].ops.length - 1;

        lastIp = currentIp;
        currentIp = state.ip;

        codeOutput = state.show();

        codeState.invalidate();
    }

    function handleUstep() {
        if (!isRunning && parsedCode) {
            codeState.data = new State(parsedCode);
            lastIp = 0;
        }

        isRunning = true;

        const state = codeState.data!;

        const { idx } = state.stepOne();
        lastUopIdx = idx;

        lastIp = currentIp;
        currentIp = state.ip;

        codeOutput = state.show();

        codeState.invalidate();
    }

    async function handleRun(e: MouseEvent) {
        handleReset(e);

        isRunning = true;

        if (parsedCode) {
            codeState.data = new State(parsedCode);
        }

        let i = 0;

        const state = codeState.data!;

        while (i < opsLimit && state.ip >= 0 && state.ip < state.code.length) {
            if (shouldStop) return;

            const { idx } = state.stepOne();
            lastUopIdx = idx;

            lastIp = currentIp;
            currentIp = state.ip;

            codeOutput = state.show();

            codeState.invalidate();

            if (stepTime > 0) {
                await new Promise((res) => setTimeout(res, stepTime));
            }
        }
    }

    function handleReset(e: Element | Event) {
        isRunning = false;
        codeOutput = "...";
        lastIp = -1;
        currentIp = 0;
        lastUopIdx = 0;
    }

    $effect(() => {
        if (editor && !isRunning) {
            editor.spellcheck = false;
            editor.focus();
        }
    });
</script>

<svelte:head>
    <title>RegSim</title>
    <meta name="description" content="FIIT STU Register Simulator" />
</svelte:head>

<main id="center" use:handleReset>
    <h1>RegSim v2</h1>
    <div class="code-container">
        {#if isRunning}
            <div class="code code-editor">
                {#each ops as op, idx}
                    <p class={idx == lastIp ? "current-op" : ""}>
                        {op}
                    </p>
                {/each}
            </div>
        {:else}
            <div
                bind:this={editor}
                bind:innerText={asm}
                class="code code-editor"
                contenteditable
            ></div>
        {/if}
        <div class="code ops-view">
            {#if parsedCode}
                {#each parsedCode[displayedIp] as uop, idx}
                    <p
                        class={isRunning && idx == lastUopIdx
                            ? "current-op"
                            : ""}
                    >
                        {uop}
                    </p>
                {/each}
            {:else}
                <p class="error">Parse error: {parseError!.message}</p>
            {/if}
        </div>
    </div>
    <div class="buttons">
        <button onclick={handleRun} type="button" class="button"
            >Run code</button
        >
        <button
            onclick={() => (shouldStop = true)}
            type="button"
            class="button"
        >
            ⏹️</button
        >
        <button onclick={handleReset} type="button" class="button">🔁</button>
        <button onclick={handleUstep} type="button" class="button">▶️</button>
        <button onclick={handleStep} type="button" class="button">⏩</button>
    </div>
    <div class="buttons">
        <label class="label" for="step-time">Step time (ms):</label>
        <input
            bind:value={stepTime}
            class="number-input"
            id="step-time"
            type="number"
        />
        <label class="label" for="ops-limit">Max operations:</label>
        <input
            bind:value={opsLimit}
            class="number-input"
            id="ops-limit"
            type="number"
        />
    </div>
    <pre class="code output">{codeOutput}</pre>
</main>

<style>
    h1 {
        font-family: var(--heading);
        font-weight: 500;
        color: var(--text-h);
    }

    h1 {
        font-size: 56px;
        letter-spacing: -1.68px;
        margin: 32px 0;
        @media (max-width: 1024px) {
            font-size: 36px;
            margin: 20px 0;
        }
    }

    p {
        margin: 0;
    }

    .code-container {
        width: 67%;
        display: flex;
        justify-content: center;
        gap: 1rem;

        margin-top: 2rem;

        & > * {
            margin: 0;
        }
    }

    .code-editor,
    .ops-view {
        width: 100%;
        font-family: var(--mono);
        font-size: 15px;
        line-height: 135%;
        padding: 4px 8px;
        background: var(--code-bg);
        text-align: start;

        resize: none;

        & > p {
            margin: 0;
        }
    }

    .current-op {
        color: var(--code-bg);
        background: var(--text);
    }

    .output {
        width: 67%;
        font-family: var(--mono);
        font-size: 15px;
        line-height: 135%;
        padding: 4px 8px;
        background: var(--code-bg);
        text-align: start;
    }

    .buttons {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        & > * {
            margin: 0;
        }
    }

    #center {
        display: flex;
        flex-direction: column;
        gap: 25px;
        place-content: center;
        place-items: center;
        flex-grow: 1;

        @media (max-width: 1024px) {
            padding: 32px 20px 24px;
            gap: 18px;
        }
    }

    .label,
    .button {
        height: 2rem;

        font-family: var(--mono);
        font-size: 16px;
        color: var(--text);
        background-color: var(--accent-bg);
        font-weight: bold;

        align-self: center;
        align-content: center;

        padding: 5px 10px;
        border-radius: 5px;

        border: none;

        margin: 0;

        &:hover {
            border-color: var(--accent-border);
        }
        &:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
    }

    .number-input {
        font-family: var(--mono);
        font-size: 14px;
        color: var(--text);

        width: 4rem;
        height: 2rem;
        margin: 0;
    }

    .error {
        color: var(--error);
        font-weight: bold;
    }
</style>
