export const CATEGORIES = [
    "메인 캐릭터", "녹인점", "고대", "지옥", "토보서", "채운산", "비휴", 
    "기린", "맹극", "와묘", "신조", "천상", "타장르", "기타"
];

// 캐릭터 설명 섹션 8종 정의
export const DETAIL_SECTIONS = [
    { id: 'appearance', label: '외모' },
    { id: 'personality', label: '성격' },
    { id: 'ability', label: '능력' },
    { id: 'motif', label: '모티브' },
    { id: 'name_origin', label: '이름' },
    { id: 'trivia', label: '여담' },
    { id: 'yusu_huihwa', label: '유수희화' },
    { id: 'etc', label: '기타' }
];

export const CHARACTERS = [
    { 
        id: 'tianlu', 
        category: '메인 캐릭터', 
        name: '천록 (天禄)', 
        title: '부를 불러와주는 비휴', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbcXQoT%2FdJMcadA2rAc%2FAAAAAAAAAAAAAAAAAAAAAIL2JD45iIL4id-sqMYSQvlK0xdRWR-RaQhfhIvNqqnY%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1774969199%26allow_ip%3D%26allow_referer%3D%26signature%3DYi2%252FKXk7uewzxqx81NjWPhZJmY4%253D', 
        nickname: '천록이', gender: '남성', species: '비휴 (벽사)', height: '약 40cm', furColor: '하얀색/옥색', eyeColor: '노란색', nationality: '중국', birthday: '알 수 없음',
        // 8대 섹션 데이터
        appearance: '하얀 털과 옥색 포인트가 특징인 작은 비휴의 모습입니다.',
        personality: '천진난만하고 낙천적이며, 먹을 것을 매우 좋아합니다.',
        ability: '금은보화를 먹고 부를 불러오는 능력이 있습니다.',
        motif: '중국 신화 속의 영수 비휴(天禄).',
        name_origin: '하늘의 복록을 의미하는 천록(天禄)에서 유래.',
        trivia: '작중에서 가장 인기가 많은 캐릭터 중 하나입니다.',
        yusu_huihwa: '유수희화 관련 정보가 업데이트 예정입니다.',
        etc: '동생인 벽사와 함께 다닙니다.'
    },
    { 
        id: 'pixiu', 
        category: '메인 캐릭터', 
        name: '벽사 (辟邪)', 
        title: '수호의 신수', 
        image: 'https://postfiles.pstatic.net/MjAyNjAyMjdfMjE5/MDAxNzcyMTc1OTg0OTU3.OyQB3R7OC-15vRNB79JX8r6Wd5JxTUiHvsZxAqq5nLMg.YuP3_LtcBn5f7tcsxYnFY1UDKFE-haIuNSxbbhihH3gg.JPEG/%EB%B2%BD%EC%82%AC.jpg?type=w966', 
        nickname: '-', gender: '남성', species: '비휴 (벽사)', height: '-', furColor: '푸른색/남색', eyeColor: '벽안', nationality: '중국', birthday: '알 수 없음',
        appearance: '푸른색 계열의 털을 가진 성숙한 벽사의 모습입니다.',
        personality: '조용하고 신중하며 동생을 끔찍이 아낍니다.',
        ability: '악을 물리치고 수호하는 능력이 강력합니다.',
        motif: '중국 신화 속의 영수 비휴(辟邪).',
        name_origin: '사악한 것을 물리친다는 의미의 벽사(辟邪)에서 유래.',
        trivia: '천록의 형으로 정신적 지주 역할을 합니다.',
        yusu_huihwa: '-',
        etc: '-'
    },
    { 
        id: 'sibuxiang', 
        category: '메인 캐릭터', 
        name: '사불상 (四不像)', 
        title: '유물 가게 주인', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbD0eLx%2FdJMcafr9eyx%2FAAAAAAAAAAAAAAAAAAAAAAjZQRaTjqxLHFq1C_vz2DjDAmpHr_i6HehWlH-4obHD%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3D9D2sgrhZJBp%252BVyeDIj5nf1TMJN8%253D', 
        nickname: '-', gender: '남성', species: '기린', height: '-', furColor: '연갈색', eyeColor: '갈색', nationality: '중국', birthday: '알 수 없음',
        appearance: '안경을 쓰고 지적인 분위기를 풍기는 기린입니다.',
        personality: '침착하고 현명하며 때로는 엄격합니다.',
        ability: '강력한 신통력과 유물에 대한 해박한 지식을 가졌습니다.',
        motif: '봉신연의 등에서 유래한 사불상/기린.',
        name_origin: '네 가지 동물을 닮았으나 그 어느 것도 아니라는 의미.',
        trivia: '루렌디엔 유물 가게를 운영하고 있습니다.',
        yusu_huihwa: '-',
        etc: '-'
    },
    { 
        id: 'tony', 
        category: '메인 캐릭터', 
        name: '투예 (兔爷)', 
        title: '달토끼 기업가', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FKcUIj%2FdJMcaflokNh%2FAAAAAAAAAAAAAAAAAAAAAGSQRnO0c8CI22cpfXLpydcTTRVnKqg4FgAas4yhvs0Y%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3DNaFtgpU5vmas1VzvSRfUJ%252Fvn7zw%253D', 
        nickname: '토니', gender: '남성', species: '토끼', height: '-', furColor: '흰색', eyeColor: '빨간색', nationality: '달', birthday: '알 수 없음',
        appearance: '화려한 옷을 입은 신사적인 달토끼입니다.',
        personality: '자신감이 넘치고 열정적이며 사불상을 좋아합니다.',
        ability: '자본력과 달토끼 특유의 기술력을 보유하고 있습니다.',
        motif: '중국 전통 인형 투예(兔儿爷).',
        name_origin: '투예(兔爷)라는 명칭 그대로 사용.',
        trivia: '엄청난 부자로 알려져 있습니다.',
        yusu_huihwa: '-',
        etc: '-'
    },
    ...["금각", "은각", "호두", "후쿠", "쇼타", "마키", "전호", "메이메이", "파릉군", "파혁", "영야"].map(name => ({
        id: `nok-${name}`, category: '녹인점', name, title: '녹인점 소속', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), 
        nickname: '-', gender: '-', species: '-', height: '-', furColor: '-', eyeColor: '-', nationality: '-', birthday: '-',
        appearance: `${name}의 외모 설명입니다.`,
        personality: `${name}의 성격 설명입니다.`,
        ability: `${name}의 능력 설명입니다.`,
        motif: '-',
        name_origin: '-',
        trivia: '-',
        yusu_huihwa: '-',
        etc: '-'
    }))
];
