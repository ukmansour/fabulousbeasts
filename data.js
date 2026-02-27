export const CATEGORIES = [
    "메인 캐릭터", "녹인점", "고대", "지옥", "토보서", "채운산", "비휴", 
    "기린", "맹극", "와묘", "신조", "천상", "타장르", "기타"
];

export const CHARACTERS = [
    { 
        id: 'tianlu', 
        category: '메인 캐릭터', 
        name: '천록 (天禄)', 
        title: '부를 불러와주는 비휴', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbcXQoT%2FdJMcadA2rAc%2FAAAAAAAAAAAAAAAAAAAAAIL2JD45iIL4id-sqMYSQvlK0xdRWR-RaQhfhIvNqqnY%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3DuIV48xImOA7ML2o92NQPjf764VI%253D', 
        desc: '금품을 먹는 어린 벽사. 부와 행운을 불러옵니다.', 
        lore: '고대 신화 속의 벽사(Pi Xiu)입니다.', 
        personality: '천진난만하고 낙천적입니다.',
        nickname: '천록이', gender: '남성', species: '비휴 (벽사)', height: '약 40cm', furColor: '하얀색/옥색', eyeColor: '노란색', nationality: '중국', birthday: '알 수 없음'
    },
    { 
        id: 'pixiu', 
        category: '메인 캐릭터', 
        name: '벽사 (辟邪)', 
        title: '수호의 신수', 
        image: 'https://postfiles.pstatic.net/MjAyNjAyMjdfMjE5/MDAxNzcyMTc1OTg0OTU3.OyQB3R7OC-15vRNB79JX8r6Wd5JxTUiHvsZxAqq5nLMg.YuP3_LtcBn5f7tcsxYnFY1UDKFE-haIuNSxbbhihH3gg.JPEG/%EB%B2%BD%EC%82%AC.jpg?type=w966', 
        desc: '천록의 형. 더 성숙하고 강력한 힘을 지니고 있습니다.', 
        lore: '동생을 끔찍이 아끼는 보호자입니다.', 
        personality: '조용하고 신중합니다.',
        nickname: '-', gender: '남성', species: '비휴 (벽사)', height: '-', furColor: '푸른색/남색', eyeColor: '벽안', nationality: '중국', birthday: '알 수 없음'
    },
    { 
        id: 'sibuxiang', 
        category: '메인 캐릭터', 
        name: '사불상 (四不像)', 
        title: '유물 가게 주인', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbD0eLx%2FdJMcafr9eyx%2FAAAAAAAAAAAAAAAAAAAAAAjZQRaTjqxLHFq1C_vz2DjDAmpHr_i6HehWlH-4obHD%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3D9D2sgrhZJBp%252BVyeDIj5nf1TMJN8%253D', 
        desc: '루렌디엔 유물 가게의 주인입니다.', 
        lore: '기린의 첫째 아들로 강력한 신통력을 가졌습니다.', 
        personality: '침착하고 현명합니다.',
        nickname: '-', gender: '남성', species: '기린', height: '-', furColor: '연갈색', eyeColor: '갈색', nationality: '중국', birthday: '알 수 없음'
    },
    { 
        id: 'tony', 
        category: '메인 캐릭터', 
        name: '투예 (兔爷)', 
        title: '달토끼 기업가', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FKcUIj%2FdJMcaflokNh%2FAAAAAAAAAAAAAAAAAAAAAGSQRnO0c8CI22cpfXLpydcTTRVnKqg4FgAas4yhvs0Y%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3DNaFtgpU5vmas1VzvSRfUJ%252Fvn7zw%253D', 
        desc: '달에서 온 부유한 사업가입니다.', 
        lore: '사불상을 짝사랑하여 항상 구애합니다.', 
        personality: '자신감 넘치고 화려합니다.',
        nickname: '토니', gender: '남성', species: '토끼', height: '-', furColor: '흰색', eyeColor: '빨간색', nationality: '달', birthday: '알 수 없음'
    },
    // ... 나머지 캐릭터들도 기본 형식을 갖춥니다
    ...["금각", "은각", "호두", "후쿠", "쇼타", "마키", "전호", "메이메이", "파릉군", "파혁", "영야"].map(name => ({
        id: `nok-${name}`, category: '녹인점', name, title: '녹인점 소속', image: 'https://via.placeholder.com/300?text=' + encodeURIComponent(name), desc: `${name} 캐릭터입니다.`, lore: '녹인점의 일원입니다.', personality: '다양한 매력을 가졌습니다.'
    }))
];
