/**
 * 캐릭터 데이터 통합 관리 파일
 * 전체 캐릭터 정보를 계층 구조로 저장합니다.
 */

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

export const CHARACTER_COLLECTION = {
    '메인 캐릭터': {
        '사장님': {
            sibuxiang: { id: 'sibuxiang', category: '메인 캐릭터', name: '사불상 (四不像)' }
        },
        '비휴 형제': {
            tianlu: { id: 'tianlu', category: '메인 캐릭터', name: '천록 (天禄 / 피피)' },
            pixiu: { id: 'pixiu', category: '메인 캐릭터', name: '벽사 (辟邪)' }
        },
        '동료': {
            tony: { id: 'tony', category: '메인 캐릭터', name: '투예 (兔爷 / 토야)' }
        }
    },
    '녹인점': {
        '직원': {
            '금은 형제': {
                'nok-금각': { id: 'nok-금각', category: '녹인점', name: '금각' },
                'nok-은각': { id: 'nok-은각', category: '녹인점', name: '은각' }
            },
            '요괴 및 신수': {
                'nok-호두': { id: 'nok-호두', category: '녹인점', name: '호두 (核桃)' },
                'nok-파혁': { id: 'nok-파혁', category: '녹인점', name: '파혁' },
                'nok-후쿠': { id: 'nok-후쿠', category: '녹인점', name: '후쿠' },
                'nok-쇼타': { id: 'nok-쇼타', category: '녹인점', name: '쇼타' },
                'nok-메이메이': { id: 'nok-메이메이', category: '녹인점', name: '메이메이' }
            },
            '기타 직원': {
                ...["마키", "전호", "샤오자오", "영야", "제건", "링후쯔", "산예"].reduce((acc, name) => {
                    acc[`nok-${name}`] = { id: `nok-${name}`, category: '녹인점', name };
                    return acc;
                }, {})
            }
        }
    },
    '천상': {
        '관리직': {
            'sky-잉쟈오': { id: 'sky-잉쟈오', category: '천상', name: '잉쟈오' },
            'sky-정향': { id: 'sky-정향', category: '천상', name: '정향' }
        }
    },
    '고대': {
        '사흉': {
            'anc-혼돈': { id: 'anc-혼돈', category: '고대', name: '혼돈' },
            'anc-도철': { id: `anc-도철`, category: '고대', name: '도철' },
            'anc-궁기': { id: 'anc-궁기', category: '고대', name: '궁기' },
            'anc-도올': { id: `anc-도올`, category: '고대', name: '도올' }
        },
        '기타 고대신수': {
            ...["사불상 (고대)", "제강", "경천수", "금오", "촉룡", "후"].reduce((acc, name) => {
                acc[`anc-${name.replace(/\s/g, '-')}`] = { id: `anc-${name.replace(/\s/g, '-')}`, category: '고대', name };
                return acc;
            }, {})
        }
    },
    '지옥': {
        '소루 및 관리자': {
            'hell-소루': { id: 'hell-소루', category: '지옥', name: '소루' },
            ...["체청", "칭훠", "지마", "아오"].reduce((acc, name) => {
                acc[`hell-${name}`] = { id: `hell-${name}`, category: '지옥', name };
                return acc;
            }, {})
        }
    },
    '토보서 그룹': {
        '토보서와 직원': {
            ...["토보서", "다람쥐 형", "황사아", "황오", "보보"].reduce((acc, name) => {
                acc[`tob-${name}`] = { id: `tob-${name}`, category: '토보서 그룹', name };
                return acc;
            }, {})
        }
    },
    '운남산 언덕': {
        '이웃 신수': {
            'un-리치': { id: 'un-리치', category: '운남산 언덕', name: '리치' },
            'un-장장': { id: 'un-장장', category: '운남산 언덕', name: '장장' },
            'un-추구': { id: 'un-추구', category: '운남산 언덕', name: '추구' },
            'un-마오마오레이': { id: 'un-마오마오레이', category: '운남산 언덕', name: '마오마오레이' },
            'un-소산작': { id: 'un-소산작', category: '운남산 언덕', name: '소산작' },
            'un-반호': { id: 'un-반호', category: '운남산 언덕', name: '반호' }
        },
        '차세대 신수': {
            ...["해치", "화초", "샤오빙", "유성", "피칠성", "토삼성", "사일성"].reduce((acc, name) => {
                acc[`un-${name}`] = { id: `un-${name}`, category: '운남산 언덕', name };
                return acc;
            }, {})
        }
    },
    '기린': {
        '기린 일가': {
            ...["시기린", "옥기린", "당기린", "봉성성", "포도", "비준", "사과", "항항"].reduce((acc, name) => {
                acc[`gir-${name}`] = { id: `gir-${name}`, category: '기린', name };
                return acc;
            }, {})
        }
    },
    '맹극': {
        '맹극 부족': {
            'men-협죽도': { id: 'men-협죽도', category: '맹극', name: '협죽도' },
            ...["목화", "운두"].reduce((acc, name) => {
                acc[`men-${name}`] = { id: `men-${name}`, category: '맹극', name };
                return acc;
            }, {})
        }
    },
    '와묘': {
        '와묘/묘룡': {
            ...["용묘", "묘룡"].reduce((acc, name) => {
                acc[`wa-${name}`] = { id: `wa-${name}`, category: '와묘', name };
                return acc;
            }, {})
        }
    },
    '신조': {
        '신비한 새들': {
            'sin-화예조': { id: 'sin-화예조', category: '신조', name: '화예조' },
            ...["봉황", "금시대", "크리스티나", "비비", "풍황", "공작", "홍홍", "오병"].reduce((acc, name) => {
                acc[`sin-${name}`] = { id: `sin-${name}`, category: '신조', name };
                return acc;
            }, {})
        }
    },
    '다른장르': {
        '임시 캐릭터': {
            ...[1, 2, 3, 4, 5, 6].reduce((acc, i) => {
                acc[`oth-${i}`] = { id: `oth-${i}`, category: '다른장르', name: `임시 캐릭터 ${i}` };
                return acc;
            }, {})
        }
    },
    '기타': {
        '기타': {
            'etc-1': { id: 'etc-1', category: '기타', name: '기타 캐릭터' }
        }
    }
};

/**
 * 기존 코드와의 호환성을 위해 평탄화된 배열을 반환합니다.
 */
export function getFlattenedCharacters() {
    const flattened = [];
    
    function traverse(obj) {
        for (const key in obj) {
            if (obj[key].id) {
                const char = { ...obj[key] };
                char.details = '본문 내용이 비어있습니다. 관리자 계정으로 로그인하여 내용을 채워주세요.';
                flattened.push(char);
            } else {
                traverse(obj[key]);
            }
        }
    }
    
    traverse(CHARACTER_COLLECTION);
    return flattened;
}

export const CHARACTERS = getFlattenedCharacters();
