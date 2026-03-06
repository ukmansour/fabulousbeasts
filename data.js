export const CATEGORIES = [
    "메인 캐릭터", "녹인점", "고대", "지옥", "토보서", "채운산", "비휴", 
    "기린", "맹극", "와묘", "신조", "천상", "타장르", "기타"
];

// 캐릭터 설명 섹션 8종 정의
export const DETAIL_SECTIONS = [
    { id: 'appearance', label: '외모', num: 1 },
    { id: 'personality', label: '성격', num: 2 },
    { id: 'ability', label: '능력', num: 3 },
    { id: 'motif', label: '모티브', num: 4 },
    { id: 'name_origin', label: '이름', num: 5 },
    { id: 'trivia', label: '여담', num: 6 },
    { id: 'yusu_huihwa', label: '유수희화', num: 7 },
    { id: 'etc', label: '기타', num: 8 }
];

export const CHARACTERS = [
    { 
        id: 'tianlu', 
        category: '메인 캐릭터', 
        name: '천록 (天禄)', 
        title: '부를 불러와주는 비휴', 
        image: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbcXQoT%2FdJMcadA2rAc%2FAAAAAAAAAAAAAAAAAAAAAIL2JD45iIL4id-sqMYSQvlK0xdRWR-RaQhfhIvNqqnY%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1774969199%26allow_ip%3D%26allow_referer%3D%26signature%3DYi2%252FKXk7uewzxqx81NjWPhZJmY4%253D', 
        nickname: '피피', gender: '남', species: '비휴', height: '53cm', furColor: '흰색, 파란색', eyeColor: '초록-노랑 그라데이션', nationality: '중국', birthday: '4월 5일',
        
        appearance: `일반적인 형태의 천록은 작은 개나 고양이와 비슷한 모습의 동물이다. 몸은 대부분 흰색 털로 덮여 있으며, 몸의 뒷부분 양쪽에는 파란색 원형 무늬가 있다. 또한 푹신한 파란색 꼬리와 구름 모양의 파란 눈썹을 가지고 있다.<br><br>머리 위에는 금색의 뿔이 하나 나 있으며 귀 안쪽은 연한 붉은색이다. 눈은 초록색에서 노란색으로 이어지는 그라데이션을 띤다. 발바닥 젤리는 선명한 빨간색이며 발끝과 귀 안쪽은 옅은 분홍색이다. 또한 볼에는 눈에 띄는 붉은 홍조가 있다.<br><br>다른 비휴와 마찬가지로 항문이 없다.<br><br>천록은 자신의 몸 크기를 자유롭게 변화시킬 수 있으며, 몸을 크게 키우거나 작게 줄일 수 있다. 몸이 커지면 전체적으로 훨씬 크고 길쭉한 모습이 되며, 뿔·귀·눈·발톱·무늬 등의 특징이 더 길어지거나 날카롭게 변한다. 이 상태에서는 전반적으로 훨씬 사납고 공격적인 인상을 준다.<br><br>몸이 커진 상태는 천록의 <b>"원래 모습"</b>으로 불린다.`,
        
        personality: `현재 시점에서 처음 등장했을 때 천록은 무례하고 다혈질이며 반항적인 작은 맹수로 묘사된다. 대부분의 존재를 존중하지 않으며 자신을 가장 중요하게 여긴다. 그는 매우 대담하고 지나치게 자신감이 넘치며, 자신을 길조를 가져오는 신수라고 생각하고 세상에서 유일한 비휴라고 믿고 있다.<br><br>자신의 뜻대로 일이 풀리지 않으면 쉽게 짜증을 내며 때로는 이기적으로 보이기도 한다. 그러나 이러한 자존심 강한 겉모습 뒤에는 자신이 사랑하는 존재들을 깊이 아끼는 면도 있어, 그들을 위해 싸우고 보호하려 한다.<br><br>고대의 신수로서 매우 오래 살았지만 성격은 어린아이와 비슷하여 항상 활기차고 놀기를 좋아한다. 또한 장난기 많고 짓궂은 면도 있다. 이러한 성격 때문에 때로는 순진하거나 무모하게 행동하기도 하며, 세상이나 미지의 것에 대해 크게 두려워하지 않는 자유로운 성향을 보인다. 이는 자신의 능력이라면 어떤 문제도 해결할 수 있다고 과신하기 때문이다.<br><br>세상을 바라보는 시각과 행동 방식 역시 어린아이 같은 면이 있으며, 이런 순진함 때문에 토보서가 자신을 좋아한다는 사실조차 눈치채지 못한다.<br><br>다른 사람에 대해 복잡하게 판단하는 편은 아니며, 호감이든 혐오든 자신의 감정을 매우 분명하게 드러낸다. 친절과 칭찬을 받으면 쉽게 기분이 좋아지고 상대와 친구가 되기도 하는데, 이는 그의 자존심을 만족시키기 때문이다.<br><br>이러한 단점에도 불구하고 그는 친구나 동료로서 믿을 만한 존재가 되기도 하며, 필요할 때는 책임감 있게 행동하고 친구들에게 친절하며 맡은 일을 끝까지 해내려는 의지를 보인다.<br><br><b>2.1 원래 모습:</b> 천록이 <b>"원래 모습"</b>으로 변하면 자존심과 자아도 더욱 강해지며, 자신의 위압적인 외형에 걸맞게 행동하려 한다. 이 상태에서는 더 성숙하고 진지하게 행동하기도 하며 공격적이고 위협적인 면도 드러난다. 하지만 여전히 같은 비휴이기 때문에 때때로 어린아이처럼 철없고 뻔뻔한 행동을 보이기도 한다.<br><br>인간과의 관계는 대체로 중립적이지만 약간 긴장된 편이다. 그는 인간을 열등한 <b>“진흙 인간”</b>이라고 부르며, 인간들이 자신을 잡거나 능력을 이용하려 할 때 짜증을 낸다.<br><br><b>2.2 상고 시대:</b> 상고 시대에 어린 맹수였을 때의 천록 역시 위에서 언급된 성격을 대부분 지니고 있었지만, 지금보다 훨씬 단순하고 순진한 모습이었다. 또한 자존심도 지금보다 덜했으며 어린아이처럼 아무것도 모르고 자유롭게 행동하는 면이 더욱 두드러졌다. 쌍둥이 형제인 벽사를 매우 아끼지만 때때로 철없는 행동을 하기도 했으며, 그 때문에 벽사가 대부분 천록을 보호하고 책임지는 역할을 했다.<br><br>기억을 잃기 전부터 성장한 시기 사이의 성격 변화는 일부 장면과 다른 캐릭터들의 언급을 통해서만 조금씩 암시된다. 그는 벽사와 사불상을 매우 소중히 여기며 형제를 위해 자신의 목숨까지 걸려고 한다. 비휴의 심장 봉인이 풀려 기억을 되찾은 후에는 사불상과의 관계가 잠시 악화되어 처음에는 적대적인 태도를 보이지만 곧 감정을 가라앉힌다.`,
        
        ability: `<b>행운 부여:</b> 비휴는 재물을 가져오고 액운을 쫓는 존재로 알려져 있으며, 쓰다듬으면 행운과 성공, 번영을 가져온다고 믿어진다. 이 때문에 천록은 인간들에게 자주 쫓기거나 사냥당했다. 사불상은 이를 이용해 돈을 받고 비휴를 쓰다듬게 하는 장사를 하기도 했다. 또한 매우 운이 좋은 편이라 마작과 같이 운이 중요한 게임에서는 거의 항상 이긴다.<br><br><b>식욕:</b> 천록은 거의 무엇이든 먹을 수 있으며 작은 음식뿐만 아니라 큰 물체도 삼킬 수 있다. 특히 금, 은, 보석, 유물과 같은 귀중품을 매우 좋아한다. 심지어 자신보다 큰 생물도 통째로 삼킬 수 있다.<br><br><b>크기 변화:</b> 자신의 크기와 외형을 자유롭게 바꿀 수 있다. 작은 형태로 줄어들 수도 있고 거대하고 사나운 모습으로 변할 수도 있다. 후자의 모습은 일반적으로 <b>“원래 모습”</b>이라고 불린다.<br><br><b>유혹적인 향기:</b> 잠들어 있을 때 향기로운 냄새를 내어 동물들을 끌어들인다.<br><br><b>비행:</b> 날다람쥐와 비슷한 비막이 있어 활공할 수 있다.<br><br><b>뿔:</b> 몇백 년마다 뿔이 빠지고 다시 자라며 새로 자란 뿔은 부드럽다.<br><br><b>사냥:</b> 포식성 신수답게 뛰어난 사냥 본능을 지녔다.<br><br><b>예술:</b> 그림을 꽤 잘 그린다.`,
        
        motif: `<b>비휴(貔貅)</b>는 중국 신화에 등장하는 신수로 사나운 외형과 길한 능력으로 알려져 있다. 보물을 먹고 살아가며 항문이 없어 먹은 보물을 배출하지 않는다고 전해진다. 그래서 재물과 행운, 번영을 가져오는 존재로 여겨진다.`,
        
        name_origin: `<b>천록(하늘 天, 녹 禄) / 티엔루:</b> 하늘이 내려주는 부와 복이라는 의미를 가진 이름이다.<br><b>비휴(맹수이름 貔, 비휴 貅) / 피슈:</b> 전설 속 신수의 이름.<br><br>또한 <b>피피(皮皮)</b>라는 별명으로도 자주 불린다.`,
        
        trivia: `<ul><li>처음 녹인점에 왔을 때 건물 밖 개집에서 잠을 잤다. 이후 사불상의 방으로 옮겼다.</li><li>작품 내 개그요소로 자주 개 취급을 받는다.</li><li>사실은 자신만의 옷을 입고 싶어 한다.</li><li>처음 신발을 신었을 때 너무 놀라 움직이지 못한 적이 있다.</li><li>대부분의 야생 신수처럼 빨간색을 싫어한다.</li><li>항문이 없기 때문에 침으로 영역 표시를 한다.</li><li><b>한 번은 운석에 맞아 죽은 적도 있다.</b></li></ul>`,
        
        yusu_huihwa: `애니메이션 및 만화 '유수희화' 시리즈에서 주인공으로서 다양한 활약을 보여준다.`,
        
        etc: `현재 루렌디엔 유물 가게에서 사불상, 벽사와 함께 지내고 있다.`
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
