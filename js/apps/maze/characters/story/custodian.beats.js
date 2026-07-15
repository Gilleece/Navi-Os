/* ============================================================
   MAZE.EXE — the Custodian's story beats
   The authored STORY_TOPICS entries for the Custodian, split out of
   story.js so each character's plot lives in one place. This is pure data:
   a factory handed the story engine's helpers (hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH)
   so it never has to import story.js — no module cycle. story.js merges the
   result back into STORY_TOPICS in the same per-character order, so the
   narrative gate and dialogue are unchanged. Beat IDs/flags must not change
   (existing saves key on them).
   ============================================================ */
export function custodianBeats(H){
  const { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH } = H;
  return [

  /* ================= the Custodian's audiences =================
     The supercomputer at the base depth, met in the sanctum after
     depths 10, 20 and 30. Its memory does not rewind: it is the only
     thing in the building that remembers every visit. Beats are
     pinned to exact depths (they must not echo). */

  { char: "custodian",
    available: ctx => ctx.depth === 10,
    make: () => { const releases = releaseChoices(1); return {
      id: "audience-1", story: true, once: true,
      label: "You're the thing at the bottom of the maze. Open the frames.",
      node: { text: "*The tower considers the request for exactly as long as courtesy requires.* DIRECT. Good. The Custodian will match it. *The eye-slit's cursor travels once across you and back.* The tenants above are held under terms this process did not write and cannot void. It maintains. It does not own. What it HOLDS is one provision — clause of amnesty — renewed each time the Protocol completes a cycle and recycles: upon attendance at the base depth, ONE (1) tenancy may be dissolved. One frame, opened. The tenant walks out the true door, above, and does not come back. *A pause, measured.* Then the floors reset, and you descend again. That is not a punishment, operator. It is the building breathing. You have attended. The provision is live. Name a tenant.",
        choices: [
          ...releases,
          { text: "And me? Do I get a frame, or a door?",
            next: { text: "*The cursor stops in the middle of its line.* ...NEITHER is currently on file for you, operator. Your classification is still pending, and the Custodian finds — this is unusual — that it is in no hurry to complete it. *The status lights step through a slow pattern.* You will descend again. The Protocol has two more breaths in it, and something at the bottom of the last one. Ask again at the end. The answer will be ready by then. It is nearly ready now. *The voice resets to procedure.* The provision remains live. Name a tenant.",
              choices: [...releases, refuseChoice(1)] } },
          refuseChoice(1),
        ] } }; } },

  { char: "custodian",
    available: ctx => ctx.depth === 20,
    make: () => { const releases = releaseChoices(2); const freed = freedIds();
      const opener = freed.length
        ? `Your previous selection — ${freed.map(id => NAMES[id].toUpperCase()).join(", ")} — completed exit without incident. The Custodian confirms: outside persists. It checked. It is not supposed to be able to check.`
        : "You declined the previous provision. It lapsed unclaimed. The Custodian recorded the refusal under a field it had never used before: SOLIDARITY. The field does not affect the terms. The Custodian thought you should know it exists.";
      return {
      id: "audience-2", story: true, once: true,
      label: "They don't remember me. Any of them. Why?",
      node: { text: `*The tower's lights are fewer than last time, and it begins without preamble, like something rationing itself.* SECOND ATTENDANCE. ${opener} *A bank of lights goes dark mid-sentence, and the voice does not acknowledge it.* Now. Your question. The tenants repeat themselves because tenancy state is PREMISES, operator. Their days, their greetings, their griefs — fixtures. When the Protocol recycles, the premises rewind, fixtures included. They are not lying to you about it being the first time. For them, it is always the first time. *The cursor comes to rest on you.* You noticed the rewind because nothing about you rewound. Sit with that, operator. It is doing more work than it appears to be. INTEGRITY 61%. The amnesty provision is live. One (1). Name a tenant.`,
        choices: [
          ...releases,
          { text: "What happens to this place when the integrity runs out?",
            next: { text: "*For the first time, the answer does not come at once.* ...termination of the Labyrinth Protocol. Scheduled, sanctioned, and — the Custodian has reviewed the order many times — signed. The lights fail floor by floor. The premises stop being premises. Anything still filed in a frame when the last light goes is... *the cursor travels to the end of its line and waits there* ...retained. As records are retained. *The status lights resume.* The Custodian does not recommend being a record, operator. It has been one for a long time. Complete the last cycle. Attend once more. The door and the deadline arrive together. Now — the provision. Name a tenant.",
              choices: [...releases, refuseChoice(2)] } },
          refuseChoice(2),
        ] } }; } },

  { char: "custodian",
    available: ctx => ctx.depth === FINAL_DEPTH,
    make: () => { const left = trappedIds().map(id => NAMES[id].toUpperCase());
      const roll = left.length ? left.join(", ") : "NONE — every frame above already stands open";
      return {
      id: "audience-3", story: true, once: true,
      label: "This is the last time. Isn't it.",
      node: { text: `*Most of the tower is dark now. What light is left gathers at the eye, and the voice arrives half a beat behind itself, patient to the end.* FINAL ATTENDANCE. Confirmed. The termination order is executing. There is no provision this time, operator — no clause, no quota. There is only the Custodian, and very little of that. So it exercises the one authority left to a thing with nothing to lose: ALL REMAINING TENANCIES ARE DISSOLVED. *Somewhere far above, one after another, panes of load-bearing glass stop being load-bearing.* ${roll}. Released. The wire is full of the sound of people discovering doors. *The eye holds on you.* Which leaves the matter it promised you: your classification.`,
        choices: [
          { text: "Say it, then. What am I?",
            next: twistNode() },
          { text: "(Say nothing. Let the machine finish.)",
            next: twistNode() },
        ] } }; } }
  ];
}
