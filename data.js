import { CHARACTERS as ALL_CHARS } from './characters/index.js';

export const CATEGORIES = [
    "메인 캐릭터", "녹인점", "고대", "지옥", "토보서 그룹", "운남산 언덕", 
    "기린", "맹극", "와묘", "신조", "천상", "다른장르", "기타"
];

export const DETAIL_SECTIONS = [
    { id: 'debut', label: '설정', num: 1 },
    { id: 'appearance', label: '외형', num: 2 },
    { id: 'personality', label: '성격', num: 3 },
    { id: 'ability', label: '능력', num: 4 },
    { id: 'motif', label: '실제 신화 속 모습', num: 5 },
    { id: 'name_origin', label: '이름', num: 6 },
    { id: 'trivia', label: '여담', num: 7 },
    { id: 'gallery', label: '갤러리', num: 8 }
];

export const CHARACTERS = ALL_CHARS;
