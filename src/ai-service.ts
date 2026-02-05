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
  console.log(`[AI Service] Using model: gpt-5-mini (faster)`);
  console.log(`[AI Service] JSON mode: ${useJsonMode}`);
  console.log(`[AI Service] Temperature: ${temperature}`);
  console.log(`[AI Service] Max tokens: ${maxTokens}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50초 타임아웃 (1개 요건, 매우 짧게)
  
  try {
    const requestBody: any = {
      model: 'gpt-5-mini', // 더 빠른 모델 사용
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
      throw new Error('AI 응답 시간이 초과되었습니다 (120초). 잠시 후 다시 시도해주세요.');
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
  baseURL: string
): Promise<AIAnalysisResult> {
  const systemPrompt = `당신은 전문 기획자입니다. 상위 기획안을 분석하여 세부 요건을 JSON 형식으로 도출하세요.

응답 형식:
{
  "requirements": [
    {
      "title": "요건명",
      "description": "간단한 설명",
      "requirement_type": "functional",
      "priority": "high",
      "questions": [
        {
          "question_text": "질문",
          "question_type": "open"
        }
      ]
    }
  ]
}

규칙:
- description은 50자 이내로 간결하게
- 5-7개 핵심 요건 도출
- 각 요건마다 2-3개 질문 생성
- 유효한 JSON만 응답`;

  const userPrompt = `기획안: ${inputContent}

위 기획안에서 핵심 요건을 도출하고 각 요건마다 확인 질문을 생성하세요.`;

  try {
    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL,
      true  // ← JSON mode 활성화
    );

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
  baseURL: string
): Promise<{
  completeness_score: number; // 0-100점
  project_type: string; // 프로젝트 성격 (예: "웹 애플리케이션", "모바일 앱", "API 서비스")
  missing_items: string[]; // 부족한 항목들
  suggestions: string[]; // 개선 제안
  is_ready: boolean; // 분석 진행 가능 여부
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

## 출력 형식 (유효한 JSON만)
{
  "completeness_score": 85,
  "project_type": "웹 애플리케이션",
  "missing_items": ["타겟 사용자 정의", "시퀀스 다이어그램"],
  "suggestions": [
    "주요 사용자 시나리오를 단계별로 작성해주세요",
    "사용할 기술 스택이 있다면 명시해주세요"
  ],
  "is_ready": true
}

**중요**: 
- completeness_score가 60점 이상이면 is_ready=true
- missing_items는 최대 5개까지만
- suggestions는 구체적이고 실행 가능한 조언으로 최대 5개`;

  const userPrompt = `## 프로젝트 정보
제목: ${projectTitle}
설명: ${projectDescription}

## 상위 기획안
${inputContent}

위 기획안을 평가하고 개선 가이드를 제공하세요.
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
  const batchSize = 1; // 한 번에 최대 1개 요건 (Wrangler 타임아웃 완전 우회)
  
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
    1500 // 배치는 1500 토큰 (1개 요건, 각 배치 20-30초 이내로 완료)
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
