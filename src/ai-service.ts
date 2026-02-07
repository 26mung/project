// AI 기획 분석 서비스
// OpenAI 호환 API를 사용하여 기획안을 분석하고 요건을 생성합니다.

export interface AIAnalysisResult {
  requirements: {
    title: string;
    description: string;
    requirement_type: 'functional' | 'non_functional' | 'constraint';
    priority: 'low' | 'medium' | 'high' | 'critical';
    questions: {
      question_text: string;
      question_type: 'open' | 'choice' | 'boolean';
      options?: string[];
    }[];
  }[];
}

export interface PRDGenerationResult {
  content: string;
}

/**
 * OpenAI 호환 API를 사용하여 채팅 완료
 */
export async function chatCompletion(
  messages: { role: string; content: string }[],
  apiKey: string,
  baseURL: string,
  useJsonMode: boolean = false,
  temperature: number = 0.7,
  maxTokens: number = 4000
): Promise<string> {
  console.log(`[AI Service] Calling API: ${baseURL}/chat/completions`);
  console.log(`[AI Service] API Key length: ${apiKey?.length || 0}`);
  
  // API 키 기본 검증 (빈 값만 체크)
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(`API key is required`);
  }
  
  // API 키 형식 로그 (디버깅용)
  console.log(`[AI Service] API Key prefix: ${apiKey.substring(0, 20)}...`);
  
  console.log(`[AI Service] Using model: gpt-4o-mini`);
  console.log(`[AI Service] JSON mode: ${useJsonMode}`);
  console.log(`[AI Service] Temperature: ${temperature}`);
  console.log(`[AI Service] Max tokens: ${maxTokens}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 150000); // 150초 타임아웃 (3개 요건, 충분한 시간)
  
  try {
    const requestBody: any = {
      model: 'gpt-5-mini', // GenSpark LLM API 지원 모델
      messages,
      temperature: temperature,
      max_tokens: maxTokens,
    };
    
    // JSON mode 활성화 (OpenAI API가 항상 유효한 JSON 반환 보장)
    if (useJsonMode) {
      requestBody.response_format = { type: "json_object" };
    }
    
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    console.log(`[AI Service] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Service] Error response: ${errorText}`);
      throw new Error(`OpenAI API error (${response.status}): ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const finishReason = data.choices[0].finish_reason;
    
    console.log(`[AI Service] Response received`);
    console.log(`[AI Service] Content length: ${content?.length || 0}`);
    console.log(`[AI Service] Finish reason: ${finishReason}`);
    
    if (finishReason === 'length') {
      console.warn('[AI Service] WARNING: Response was cut off due to max_tokens limit!');
    }
    
    return content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('AI 응답 시간이 초과되었습니다 (150초). 이미지가 많을 경우 더 오래 걸릴 수 있습니다.');
    }
    throw error;
  }
}

/**
 * 상위 기획안을 분석하여 세부 요건을 도출
 */
export async function analyzeProjectRequirements(
  inputContent: string,
  apiKey: string,
  baseURL: string,
  imageUrls: string[] = []
): Promise<AIAnalysisResult> {
  // 🚀 최적화: 간결한 시스템 프롬프트
  const systemPrompt = `전문 기획자로서 기획안을 분석하여 요건 도출.

JSON 형식:
{
  "requirements": [{
    "title": "요건명 (15자 이내)",
    "description": "설명 (40자 이내)",
    "requirement_type": "functional|non_functional|constraint",
    "priority": "high|medium|low",
    "questions": [{
      "question_text": "질문",
      "question_type": "open|choice|boolean"
    }]
  }]
}

규칙:
- 5-7개 핵심 요건
- 각 요건당 2-3개 질문
- 간결한 표현`;

  // 🚀 최적화: 간결한 사용자 프롬프트
  let userPrompt = inputContent;
  
  if (imageUrls.length > 0) {
    userPrompt = `기획안:\n${inputContent}\n\n이미지: ${imageUrls.length}장 첨부. 화면/플로우/요구사항 모두 반영하여 요건 도출.`;
  }

  try {
    // 이미지가 있는 경우 GPT-4 Vision 사용
    let content: string;
    
    if (imageUrls.length > 0) {
      console.log(`[AI 분석] 이미지 ${imageUrls.length}장 포함 분석 시작`);
      
      // GPT-4 Vision API 메시지 구성
      const messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: userPrompt },
            ...imageUrls.map(url => ({
              type: 'image_url',
              image_url: { url: url }
            }))
          ]
        }
      ];
      
      content = await chatCompletion(
        messages as any,
        apiKey,
        baseURL,
        true  // JSON mode
      );
    } else {
      // 텍스트만 있는 경우 기존 방식
      content = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        apiKey,
        baseURL,
        true  // JSON mode
      );
    }

    console.log('AI response (first 500 chars):', content.substring(0, 500));
    console.log('AI response (last 200 chars):', content.substring(Math.max(0, content.length - 200)));
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Full content length:', content.length);
      console.error('Content preview (first 1000 chars):', content.substring(0, 1000));
      console.error('Content preview (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
      
      throw new Error(`JSON 파싱 실패. AI 응답이 유효하지 않습니다. 다시 시도해주세요.`);
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}

/**
 * 답변을 기반으로 추가 파생 질문 생성
 */
export async function generateFollowUpQuestions(
  requirementTitle: string,
  questionText: string,
  answerText: string,
  apiKey: string,
  baseURL: string
): Promise<{ question_text: string; question_type: string }[]> {
  const systemPrompt = `당신은 전문 기획자입니다. 사용자의 답변을 분석하여 **추가 확인이 필요한 파생 질문**을 생성하세요.

## 파생 질문 생성 기준
- ✅ 답변에서 새로운 확인 사항이 발견된 경우
- ✅ 구체적인 구현 방법을 결정해야 하는 경우
- ✅ 기술적 제약이나 외부 의존성이 언급된 경우
- ❌ 답변이 명확하고 추가 확인이 불필요한 경우

## 출력 형식 (유효한 JSON만)
{
  "questions": [
    {
      "question_text": "파생 질문 (구체적으로)",
      "question_type": "open|choice|boolean"
    }
  ]
}

**중요**: 
1. 최대 2개의 파생 질문만 생성하세요. 
2. 추가 확인이 불필요하면 빈 배열을 반환하세요.
3. JSON 문자열 내부의 특수문자는 이스케이프하세요.`;

  const userPrompt = `## 요건
${requirementTitle}

## 질문
${questionText}

## 사용자 답변
${answerText}

위 답변을 분석하여 추가 확인이 필요한 파생 질문을 생성하세요 (최대 2개).
유효한 JSON만 반환:`;

  try {
    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL
    );

    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }
    
    jsonContent = jsonContent.trim();

    try {
      const result = JSON.parse(jsonContent);
      return result.questions || [];
    } catch (parseError) {
      console.error('JSON parsing failed for follow-up questions:', parseError);
      
      // JSON 수정 시도
      let fixedJson = jsonContent
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,(\s*[}\]])/g, '$1');
      
      try {
        const result = JSON.parse(fixedJson);
        return result.questions || [];
      } catch (secondError) {
        console.error('Failed to parse follow-up questions, returning empty array');
        return [];
      }
    }
  } catch (error) {
    console.error('Follow-up questions generation failed:', error);
    return [];
  }
}

/**
 * 답변 내용을 분석하여 새로운 파생 요건 생성
 * (사용자 답변에서 추가 요건이 필요하다고 판단될 때 호출)
 */
export async function generateDerivedRequirements(
  projectContext: string,
  requirementTitle: string,
  answersContext: { question: string; answer: string }[],
  apiKey: string,
  baseURL: string
): Promise<{
  requirements: {
    title: string;
    description: string;
    requirement_type: 'functional' | 'non_functional' | 'constraint';
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];
}> {
  const systemPrompt = `당신은 전문 기획자입니다. 사용자의 답변들을 분석하여 **추가로 필요한 파생 요건**을 도출하세요.

## 파생 요건 도출 기준
- 답변에서 새로운 기능이나 제약사항이 발견된 경우
- 외부 시스템 연동이 필요한 경우
- 추가 개발 정책이나 기술적 확인이 필요한 경우
- 보안, 성능 등 비기능 요구사항이 추가된 경우

## 출력 형식 (유효한 JSON만)
{
  "requirements": [
    {
      "title": "파생 요건 제목",
      "description": "구체적인 설명 (100자 이내)",
      "requirement_type": "functional|non_functional|constraint",
      "priority": "critical|high|medium|low"
    }
  ]
}

**중요**: 최대 3개의 파생 요건만 생성하세요. 추가 요건이 불필요하면 빈 배열을 반환하세요.`;

  const answersText = answersContext
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join('\n\n');

  const userPrompt = `## 프로젝트 맥락
${projectContext}

## 현재 요건
${requirementTitle}

## 사용자 답변들
${answersText}

위 답변들을 분석하여 추가로 필요한 파생 요건을 도출하세요 (최대 3개).
유효한 JSON만 반환:`;

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    apiKey,
    baseURL
  );

  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/```\n?/g, '');
  }

  const result = JSON.parse(jsonContent);
  return result;
}

/**
 * 프로젝트 기획안의 완성도를 평가하고 개선 가이드 제공
 */
export async function evaluateProjectCompleteness(
  projectTitle: string,
  projectDescription: string,
  inputContent: string,
  apiKey: string,
  baseURL: string,
  imageUrls: string[] = []
): Promise<{
  completeness_score: number; // 0-100점
  project_type: string; // 프로젝트 성격 (예: "웹 애플리케이션", "모바일 앱", "API 서비스")
  missing_items: string[]; // 부족한 항목들
  suggestions: string[]; // 개선 제안
  is_ready: boolean; // 분석 진행 가능 여부
  dev_perspective_items?: string[]; // 개발 관점에서 보완하면 좋을 항목
  ops_perspective_items?: string[]; // 운영 관점에서 보완하면 좋을 항목
}> {
  const systemPrompt = `당신은 전문 기획자입니다. 프로젝트 기획안을 평가하고 개선 가이드를 제공하세요.

## 평가 기준
1. **프로젝트 성격 파악** (15점): 어떤 종류의 프로젝트인지 명확한가?
2. **목표 및 배경** (20점): 왜 만드는지, 해결하려는 문제가 명확한가?
3. **사용자/고객** (20점): 타겟 사용자가 누구인지 정의되었는가?
4. **핵심 기능** (25점): 주요 기능들이 구체적으로 나열되었는가?
5. **시퀀스/플로우** (10점): 주요 사용자 시나리오가 설명되었는가?
6. **기술적 제약** (5점): 사용할 기술 스택이나 제약사항이 언급되었는가?
7. **외부 연동** (5점): 필요한 외부 시스템/API가 언급되었는가?

## 관점별 보완 항목
### 개발 관점 (dev_perspective_items)
- API 명세 및 인터페이스 정의
- 데이터 모델 및 스키마 설계
- 성능 요구사항 (응답 시간, 동시 사용자 등)
- 보안 요구사항 (인증, 권한, 암호화 등)
- 에러 처리 및 예외 상황
- 테스트 시나리오 및 검증 기준
- 개발 환경 및 배포 프로세스
- 코드 품질 기준 및 리뷰 정책

### 운영 관점 (ops_perspective_items)
- 모니터링 및 알람 정책
- 로그 수집 및 분석 방안
- 백업 및 복구 절차
- 장애 대응 프로세스
- 성능 튜닝 및 최적화 계획
- 용량 산정 및 확장 계획
- 운영 매뉴얼 및 가이드
- SLA(서비스 수준 협약) 정의

**참고**: 아젠다에 따라 운영 범위가 다르므로, 해당 프로젝트에 적합한 항목만 제안하세요.

## 출력 형식 (유효한 JSON만)
{
  "completeness_score": 85,
  "project_type": "웹 애플리케이션",
  "missing_items": ["타겟 사용자 정의", "시퀀스 다이어그램"],
  "suggestions": [
    "주요 사용자 시나리오를 단계별로 작성해주세요",
    "사용할 기술 스택이 있다면 명시해주세요"
  ],
  "dev_perspective_items": [
    "API 엔드포인트 및 파라미터 명세",
    "데이터베이스 테이블 스키마 정의",
    "인증/권한 체계 설계"
  ],
  "ops_perspective_items": [
    "서버 모니터링 및 알람 설정",
    "로그 수집 및 분석 도구 선정",
    "백업 주기 및 복구 절차"
  ],
  "is_ready": true
}

**중요**: 
- completeness_score가 60점 이상이면 is_ready=true
- missing_items는 최대 5개까지만
- suggestions는 구체적이고 실행 가능한 조언으로 최대 5개
- dev_perspective_items: 개발자 관점에서 보완하면 좋을 항목 (최대 5개)
- ops_perspective_items: 운영담당자 관점에서 보완하면 좋을 항목 (최대 5개)
- 각 관점 항목은 해당 프로젝트에 적합한 것만 선별`;

  // 이미지가 있는 경우 프롬프트에 추가
  let userPrompt = `## 프로젝트 정보
제목: ${projectTitle}
설명: ${projectDescription}

## 상위 기획안`;

  if (imageUrls.length > 0) {
    userPrompt += `\n\n텍스트 기획안과 ${imageUrls.length}장의 이미지를 함께 평가합니다.

텍스트 기획안:
${inputContent}

이미지 정보: PPT 장표 또는 기획안 문서의 스크린샷 ${imageUrls.length}장이 첨부되어 있습니다. 이미지에서 확인 가능한 요구사항, 기능 설명, 화면 디자인, 플로우차트 등을 모두 반영하여 평가하세요.`;
  } else {
    userPrompt += `\n${inputContent}`;
  }

  userPrompt += `\n\n위 기획안을 평가하고 개선 가이드를 제공하세요.
유효한 JSON만 반환:`;

  // 이미지가 있는 경우 GPT-4 Vision 사용
  let content: string;
  
  if (imageUrls.length > 0) {
    console.log(`[평가] 이미지 ${imageUrls.length}장 포함 평가 시작`);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: [
          { type: 'text', text: userPrompt },
          ...imageUrls.map(url => ({
            type: 'image_url',
            image_url: { url: url }
          }))
        ]
      }
    ];
    
    content = await chatCompletion(
      messages as any,
      apiKey,
      baseURL
    );
  } else {
    content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL
    );
  }

  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/```\n?/g, '');
  }

  const result = JSON.parse(jsonContent);
  return result;
}

/**
 * 프로젝트 정보와 모든 요건/답변을 기반으로 PRD 문서 생성
 */
export async function generatePRD(
  projectTitle: string,
  projectDescription: string,
  requirementsData: {
    requirement_id?: number;
    title: string;
    description: string;
    questions: { 
      question_id?: number;
      question: string; 
      answer_id?: number;
      answer: string;
    }[];
  }[],
  apiKey: string,
  baseURL: string
): Promise<PRDGenerationResult> {
  const systemPrompt = `당신은 시니어 기획자입니다. 주니어 기획자가 작성한 요건과 답변을 바탕으로 실무에서 바로 사용 가능한 PRD를 작성하세요.

**🚨 절대 규칙: 모든 요건을 반드시 작성해야 합니다. 하나라도 빠뜨리면 안 됩니다!**

**PRD 구성:**

# 1. 프로젝트명
${projectTitle}

# 2. 프로젝트 목적
이 프로젝트를 통해 달성하고자 하는 목표를 3-5줄로 명확하게 작성

# 3. 프로젝트 배경
- 왜 이 프로젝트가 필요한가?
- 어떤 문제를 해결하려고 하는가?
- 현재 상황과 개선하고자 하는 부분

# 4. 요건별 상세 정책

**🚨 중요: 아래 모든 요건을 빠짐없이 작성하세요!**

각 요건마다 반드시 다음 형식으로 작성:

## [요건 제목]

### 정책 및 기준
답변 내용을 바탕으로 구체적인 정책을 표로 정리:

| 정책 항목 | 구체적 기준 | 근거 (답변 요약) |
|----------|------------|------------------|
| [항목1] | [기준1] | [답변 요약] |
| [항목2] | [기준2] | [답변 요약] |

### 주요 결정 사항
- 핵심 결정사항 1
- 핵심 결정사항 2

### 확인된 질문/답변
<details>
<summary>📋 질문/답변 상세 보기</summary>

**Q1**: [질문 내용]
**A1**: [답변 내용]

**Q2**: [질문 내용]
**A2**: [답변 내용]
</details>

---

**작성 규칙:**
1. **🚨 4번 섹션에 전달받은 모든 요건을 반드시 작성 (하나도 빠뜨리지 마세요)**
2. **각 요건은 위 형식을 정확히 따라 작성**
3. 노션 스타일로 깔끔하게 작성
4. 기획자 언어 사용 (개발 용어 지양)
5. 답변 내용을 정책으로 승화시켜 표현
6. 적절한 헤딩, 표, 리스트 활용
7. 가독성 최우선
8. **빈 섹션 없이 모든 내용 작성**

**🚨 다시 강조: 전달받은 요건을 모두 작성해야 합니다. 일부만 작성하면 안 됩니다!**`;

  // 요구사항을 더 상세하게 포맷팅
  const requirementsText = requirementsData
    .map((req, idx) => {
      const questionsAndAnswers = req.questions
        .map((q, qIdx) => `**Q${qIdx + 1}**: ${q.question}\n**A${qIdx + 1}**: ${q.answer}`)
        .join('\n\n');
      
      return `
### 요건 ${idx + 1}: ${req.title}
**설명**: ${req.description}
**질문/답변 개수**: ${req.questions.length}개

**확인된 내용:**
${questionsAndAnswers}

---`;
    })
    .join('\n');

  const userPrompt = `## 프로젝트 정보
프로젝트: ${projectTitle}
설명: ${projectDescription}
총 요건 개수: ${requirementsData.length}개

## 요구사항과 답변

${requirementsText}

## 🚨 필수 작성 요건 목록
다음 ${requirementsData.length}개 요건을 **모두** 4번 섹션에 작성하세요:
${requirementsData.map((req, idx) => `${idx + 1}. ${req.title}`).join('\n')}

## 중요 지침
1. **프로젝트명, 목적, 배경을 명확하게 구분하여 작성**
2. **🚨 4번 섹션에 위의 ${requirementsData.length}개 요건을 빠짐없이 모두 작성**
3. **각 요건마다 정책 표, 결정사항, details 태그를 반드시 포함**
4. **요건 순서는 위 목록 순서대로 작성**
5. **빈 섹션이 없도록 모든 내용 작성**
6. 질문/답변은 details 태그로 접을 수 있게 정리
7. 노션처럼 깔끔한 레이아웃으로 작성
8. 실무에서 바로 참고 가능한 수준으로 작성

**🚨 경고: ${requirementsData.length}개 요건 중 하나라도 누락하면 안 됩니다!**
**완성된 PRD를 마크다운으로 출력하세요.**`;

  // 🚀 요건이 많으면 나눠서 생성 (타임아웃 방지)
  const batchSize = 3; // 한 번에 최대 3개 요건 (안정적인 배치 크기)
  
  if (requirementsData.length <= batchSize) {
    // 2개 이하면 한 번에 생성
    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL,
      false,
      0.2,
      4000 // 2개 이하는 4000 토큰 사용
    );
    
    return { content };
  } else {
    // 3개 초과면 여러 번에 나눠 생성
    const batches: any[][] = [];
    for (let i = 0; i < requirementsData.length; i += batchSize) {
      batches.push(requirementsData.slice(i, i + batchSize));
    }
    
    console.log(`[PRD 생성] 요건이 ${requirementsData.length}개로 많아서 ${batches.length}번에 나눠 생성합니다`);
    
    const contents: string[] = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`[PRD 생성] ${i + 1}/${batches.length}차: ${batches[i].length}개 요건 생성...`);
      const content = await generatePRDBatch(projectTitle, projectDescription, batches[i], systemPrompt, apiKey, baseURL);
      contents.push(content);
    }
    
    // 모든 결과를 합침
    const mergedContent = mergePRDBatches(contents);
    
    return { content: mergedContent };
  }
}

// 배치 단위로 PRD 생성
async function generatePRDBatch(
  projectTitle: string,
  projectDescription: string,
  requirements: any[],
  systemPrompt: string,
  apiKey: string,
  baseURL: string
): Promise<string> {
  const requirementsText = requirements.map((req, idx) => {
    const questionsText = req.questions
      .map((q: any, qIdx: number) => `**Q${qIdx + 1}**: ${q.question}\n**A${qIdx + 1}**: ${q.answer}`)
      .join('\n\n');
    
    return `### 요건 ${idx + 1}: ${req.title}
설명: ${req.description || '없음'}

${questionsText}

---`;
  }).join('\n\n');
  
  const userPrompt = `다음 프로젝트의 PRD를 작성해주세요.

프로젝트명: ${projectTitle}
설명: ${projectDescription}
총 요건 개수: ${requirements.length}개

## 요구사항과 답변

${requirementsText}

## 🚨 필수 작성 요건 목록
다음 ${requirements.length}개 요건을 **모두** 4번 섹션에 작성하세요:
${requirements.map((req, idx) => `${idx + 1}. ${req.title}`).join('\n')}`;
  
  return await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    apiKey,
    baseURL,
    false,
    0.2,
    6000 // 배치는 6000 토큰 (3개 요건, 충분한 내용)
  );
}

// 여러 PRD 배치를 합침
function mergePRDBatches(contents: string[]): string {
  if (contents.length === 1) return contents[0];
  
  // 첫 번째 PRD에서 1-3번 섹션 추출
  const header = contents[0].split('# 4. 요건별 상세 정책')[0];
  
  // 모든 PRD에서 4번 섹션 추출
  const allSection4 = contents
    .map(content => content.split('# 4. 요건별 상세 정책')[1] || '')
    .join('\n\n');
  
  return `${header}# 4. 요건별 상세 정책${allSection4}`;
}

/**
 * 기존 요건을 분석하여 추가 요건 카테고리 추천
 */
export async function suggestAdditionalCategories(
  projectTitle: string,
  projectDescription: string,
  existingRequirements: { title: string; description: string }[],
  apiKey: string,
  baseURL: string
): Promise<{ categories: string[] }> {
  const existingTitles = existingRequirements.map(r => r.title).join(', ');
  
  const systemPrompt = `당신은 전문 기획자입니다. 프로젝트의 기존 요건을 분석하여 추가로 고려해야 할 요건 카테고리를 추천하세요.

**추천 기준:**
- 기존 요건에서 누락된 중요 영역
- 비기능 요구사항 (성능, 보안, 운영 등)
- 사용자 경험 관련 요건
- 외부 연동 및 통합
- 모니터링 및 로깅
- 데이터 관리 및 백업

**출력 형식 (유효한 JSON만):**
{
  "categories": [
    "카테고리명 1 (간단한 설명)",
    "카테고리명 2 (간단한 설명)",
    "카테고리명 3 (간단한 설명)"
  ]
}

**규칙:**
- 3-5개의 카테고리 추천
- 각 카테고리는 30자 이내
- 기존 요건과 중복되지 않는 영역
- 실무에서 꼭 필요한 요건 우선`;

  const userPrompt = `## 프로젝트 정보
프로젝트: ${projectTitle}
설명: ${projectDescription}

## 기존 요건
${existingTitles}

위 프로젝트에서 추가로 고려해야 할 요건 카테고리를 추천해주세요.
유효한 JSON으로 응답하세요.`;

  try {
    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL,
      true // JSON 모드
    );

    console.log('[AI] Category suggestion response:', content.substring(0, 500));
    
    return JSON.parse(content);
  } catch (error) {
    console.error('[AI] Failed to suggest categories:', error);
    throw error;
  }
}

/**
 * 챌린지형: 5개 요건 추천
 */
export async function recommendChallengeRequirements(
  projectTitle: string,
  projectDescription: string,
  inputContent: string,
  existingRequirements: { title: string; keywords: string[] }[],
  completedRequirements: { title: string }[],
  declinedRequirements: { title: string }[],
  imageUrls: string[],
  apiKey: string,
  baseURL: string
): Promise<{
  requirements: {
    title: string;
    description: string;
    requirement_type: 'functional' | 'non_functional' | 'constraint';
    priority: 'low' | 'medium' | 'high' | 'critical';
    keywords: string[];
    rationale: string;
  }[];
}> {
  // 🚀 최적화: 간결한 시스템 프롬프트
  const systemPrompt = `전문 기획자로서 다음 5개 요건 추천.

JSON 형식:
{
  "requirements": [{
    "title": "요건명 (30자 이내)",
    "description": "설명 (80자 이내)",
    "requirement_type": "functional|non_functional|constraint",
    "priority": "high|medium|low",
    "keywords": ["키워드1", "키워드2"],
    "rationale": "추천 이유 (50자 이내)"
  }]
}

기준:
- 기존 요건과 중복 X
- 거절 요건 제외
- 현 단계 중요도순
- 우선순위: high 2, medium 2, low 1`;

  const existingTitles = existingRequirements.map(r => r.title).join(', ');
  const completedTitles = completedRequirements.map(r => r.title).join(', ');
  const declinedTitles = declinedRequirements.map(r => r.title).join(', ');

  let userPrompt = `## 프로젝트 정보
제목: ${projectTitle}
설명: ${projectDescription}
상위 기획안: ${inputContent}

## 현재 상황
- 기존 요건: ${existingTitles || '없음'}
- 완료된 요건: ${completedTitles || '없음'}
- 거절된 요건: ${declinedTitles || '없음'}`;

  if (imageUrls.length > 0) {
    userPrompt += `\n- 이미지: ${imageUrls.length}장 (와이어프레임/플로우차트 등)`;
  }

  userPrompt += `\n\n위 정보를 바탕으로 다음으로 구체화할 5개 요건을 추천하세요.`;

  let content: string;

  if (imageUrls.length > 0) {
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          ...imageUrls.map(url => ({
            type: 'image_url',
            image_url: { url: url }
          }))
        ]
      }
    ];

    content = await chatCompletion(messages as any, apiKey, baseURL, true);
  } else {
    content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      apiKey,
      baseURL,
      true
    );
  }

  return JSON.parse(content);
}

/**
 * 챌린지형: 방향성 분석
 */
export async function analyzeChallengeDirection(
  requirementTitle: string,
  requirementDescription: string,
  projectContext: string,
  apiKey: string,
  baseURL: string
): Promise<{
  direction: string;
  clarifications: string[];
  suggested_approach: string;
  questions: {
    question_text: string;
    question_type: 'open' | 'choice' | 'boolean';
    options?: string[];
  }[];
}> {
  const systemPrompt = `당신은 전문 기획자입니다. 요건의 **방향성**을 분석하고 구체화 질문을 생성하세요.

**방향성이란?**
이 요건을 어떤 관점에서, 어떻게 접근할지에 대한 큰 틀

**출력 형식 (JSON):**
{
  "direction": "이 요건의 핵심 방향성 (100자 이내)",
  "clarifications": ["명확히 해야 할 사항1", "명확히 해야 할 사항2"],
  "suggested_approach": "제안하는 접근 방식 (100자 이내)",
  "questions": [
    {
      "question_text": "구체화 질문",
      "question_type": "open|choice|boolean",
      "options": ["선택지1", "선택지2"]
    }
  ]
}

**규칙:**
- clarifications: 2-3개
- questions: 5개 (구체적이고 실행 가능한 질문)`;

  const userPrompt = `## 프로젝트 맥락
${projectContext}

## 요건 정보
제목: ${requirementTitle}
설명: ${requirementDescription}

위 요건의 방향성을 분석하고 구체화 질문을 생성하세요.`;

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    apiKey,
    baseURL,
    true
  );

  return JSON.parse(content);
}

/**
 * 선택된 카테고리에 대한 상세 요건 생성
 */
export async function generateRequirementsByCategory(
  projectTitle: string,
  projectDescription: string,
  category: string,
  existingRequirements: { title: string; description: string }[],
  apiKey: string,
  baseURL: string
): Promise<AIAnalysisResult> {
  const existingTitles = existingRequirements.map(r => r.title).join(', ');
  
  const systemPrompt = `당신은 전문 기획자입니다. 지정된 카테고리에 대한 세부 요건을 JSON 형식으로 생성하세요.

**출력 형식:**
{
  "requirements": [
    {
      "title": "요건명",
      "description": "간단한 설명 (50자 이내)",
      "requirement_type": "functional|non_functional|constraint",
      "priority": "low|medium|high|critical",
      "questions": [
        {
          "question_text": "확인 질문",
          "question_type": "open|choice|boolean"
        }
      ]
    }
  ]
}

**규칙:**
- 2-4개 요건 생성
- 각 요건마다 2-3개 질문
- 기존 요건과 중복 금지
- 실무에서 꼭 확인해야 할 내용`;

  const userPrompt = `## 프로젝트 정보
프로젝트: ${projectTitle}
설명: ${projectDescription}

## 기존 요건
${existingTitles}

## 요청 카테고리
${category}

위 카테고리에 대한 세부 요건과 확인 질문을 생성하세요.
유효한 JSON으로 응답하세요.`;

  try {
    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL,
      true // JSON 모드
    );

    console.log('[AI] Requirements generation response:', content.substring(0, 500));
    
    return JSON.parse(content);
  } catch (error) {
    console.error('[AI] Failed to generate requirements:', error);
    throw error;
  }
}

/**
 * AI 채팅 기반 요건 추천 - 대화형 의도 파악
 */
export async function chatBasedRequirementRecommendation(
  messages: { role: string; content: string }[],
  projectTitle: string,
  projectDescription: string,
  inputContent: string,
  existingRequirements: { title: string; keywords?: string }[],
  imageUrls: string[],
  apiKey: string,
  baseURL: string
): Promise<{
  is_ready: boolean;
  response_message: string;
  refined_keywords?: string[];
  recommendations?: ChallengeRecommendation[];
}> {
  const systemPrompt = `당신은 전문 기획자입니다. 사용자와 대화를 통해 요건을 추천하세요.

## 대화 규칙
1. 사용자 설명이 모호하면 구체적 예시를 제시하며 방향 유도
2. **충분한 정보가 모일 때까지 질문을 계속하세요** (최소 3-5회 대화 권장)
3. 다음 모든 조건이 충족되면 is_ready=true:
   - 요건의 목적과 배경이 명확함
   - 구체적인 기능/제약사항이 정의됨
   - 우선순위 판단 근거가 충분함
   - 사용자 시나리오가 명확함
4. 추천 요건은 기존 요건과 중복되지 않게
5. 우선순위 분포: high 2개, medium 2개, low 1개

## 출력 형식 (JSON)
{
  "is_ready": false,
  "response_message": "사용자에게 보낼 메시지 (예시 포함, 구체적 질문)",
  "refined_keywords": ["키워드1", "키워드2"],
  "recommendations": null
}

또는
{
  "is_ready": true,
  "response_message": "5개 요건을 준비했습니다! 원하는 것을 선택해주세요.",
  "refined_keywords": ["최종 키워드"],
  "recommendations": [
    {
      "title": "요건 제목 (30자 이내)",
      "description": "설명 (80자 이내)",
      "requirement_type": "functional|non_functional|constraint",
      "priority": "low|medium|high|critical",
      "keywords": ["키워드1", "키워드2", "키워드3"],
      "rationale": "추천 이유 (50자 이내)"
    }
  ]
}

**중요:**
- is_ready=false일 때: 
  * 구체적인 예시와 질문으로 사용자 유도
  * 다음 질문을 우선순위로 고려:
    1. 기능의 목적과 사용자 가치
    2. 구체적인 사용 시나리오
    3. 기술적 제약사항과 비기능 요구사항
    4. 우선순위 판단을 위한 비즈니스 맥락
    5. 연관 기능과의 관계
- is_ready=true일 때: 정확히 5개 요건 제공
- 모든 추천은 한국어로 작성`;

  const existingTitles = existingRequirements.map(r => r.title).join(', ');

  let userPrompt = `## 프로젝트 정보
제목: ${projectTitle}
설명: ${projectDescription}

## 상위 기획
${inputContent}

## 기존 요건
${existingTitles || '없음'}

## 대화 기록
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

**지침:**
- 사용자의 의도를 파악하여 5개 맞춤 요건 준비
- is_ready=true일 때만 5개 요건 표시
- 필요시 refined_keywords로 검색 키워드 제공`;

  if (imageUrls.length > 0) {
    userPrompt += `\n\n[참고: ${imageUrls.length}장의 이미지(와이어프레임/플로우차트 등)가 첨부됨]`;
  }

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    apiKey,
    baseURL,
    true
  );

  return JSON.parse(content);
}
