import { createContext, useContext, useState, useEffect } from 'react'
import uz    from './uz.js'
import uz_kr from './uz_kr.js'
import ru    from './ru.js'

export const LANGS = {
  uz:    { label:"O'zbek",    flag:"🇺🇿", t: uz    },
  uz_kr: { label:"Ўзбекча",   flag:"🇺🇿", t: uz_kr },
  ru:    { label:"Русский",   flag:"🇷🇺", t: ru    },
}

const LangCtx = createContext({ lang:'uz', t: uz, setLang:()=>{} })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('crm_lang') || 'uz')

  function setLang(l) {
    localStorage.setItem('crm_lang', l)
    setLangState(l)
  }

  const t = LANGS[lang]?.t || uz

  return <LangCtx.Provider value={{ lang, t, setLang }}>{children}</LangCtx.Provider>
}

export function useLang() {
  return useContext(LangCtx)
}
