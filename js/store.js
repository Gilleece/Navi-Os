/* ============================================================
   NAVI-OS — persistent storage helper
   Thin wrapper over localStorage: JSON in/out, never throws
   (private browsing, quota, disabled storage all degrade to
   session-only behaviour). Keys are prefixed "navi-".
   ============================================================ */
const PREFIX = "navi-";

export const store = {
  get(key, fallback = null){
    try{
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    }catch(e){ return fallback; }
  },
  set(key, value){
    try{ localStorage.setItem(PREFIX + key, JSON.stringify(value)); }catch(e){}
  },
  del(key){
    try{ localStorage.removeItem(PREFIX + key); }catch(e){}
  },
};
