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
  useJsonMode: boolean = false
): Promise<string> {
  console.log(`[AI Service] Calling API: ${baseURL}/chat/completions`);
  console.log(`[AI Service] API Key length: ${apiKey?.length || 0}`);
  console.log(`[AI Service] Using model: gpt-5-mini (faster)`);
  console.log(`[AI Service] JSON mode: ${useJsonMode}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃
  
  try {
    const requestBody: any = {
      model: 'gpt-5-mini', // 더 빠른 모델 사용
      messages,
      temperature: 0.7,
      max_tokens: 2000, // 토큰 제한으로 응답 속도 향상
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
    console.log(`[AI Service] Response received, content length: ${data.choices?.[0]?.message?.content?.length || 0}`);
    return data.choices[0].message.content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('AI 응답 시간이 초과되었습니다 (60초). 더 짧은 기획안을 입력해주세요.');
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
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Full content:', content);
      
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
    title: string;
    description: string;
    questions: { question: string; answer: string }[];
  }[],
  apiKey: string,
  baseURL: string
): Promise<PRDGenerationResult> {
  const systemPrompt = `당신은 시니어 기획자입니다. 주니어 기획자가 작성한 요건과 답변을 바탕으로 실무에서 바로 사용 가능한 PRD를 작성하세요.

**PRD 구성 (모두 표 형식):**

1. 📋 **프로젝트 개요**
   - 프로젝트명, 목적, 배경을 표로 정리

2. 🎯 **핵심 목표 및 성공 지표**
   - 달성 목표와 측정 방법을 표로 정리

3. 👥 **사용자 정의**
   - 타겟 사용자(페르소나)를 표로 정리

4. ⚙️ **주요 기능 목록**
   - 기능명, 설명, 우선순위를 표로 정리

5. 📋 **요건별 상세 정책 및 기준**
   **중요**: 각 요건마다 아래 형식으로 정리하세요:
   
   ### 요건명
   **답변 기반 정책:**
   | 항목 | 정책/기준 | 근거(답변 내용) |
   |------|----------|----------------|
   | ... | ... | ... |
   
   **주요 결정 사항:**
   - 답변에서 도출된 구체적인 기준들을 나열

6. 🔄 **사용자 시나리오**
   - 주요 시나리오를 단계별 표로 정리

7. 🚀 **우선순위 및 일정**
   - 단계별 구현 계획을 표로 정리

**작성 규칙:**
- 모든 섹션을 마크다운 표로 작성
- 답변 내용을 바탕으로 구체적인 정책/기준을 도출
- 기획자 언어로 작성 (화면, 기능, 사용자 행동)
- 각 요건의 답변에서 핵심 결정사항을 추출하여 명시
- 가독성을 위해 적절한 공백과 구분선 사용`;

  // 요구사항을 더 상세하게 포맷팅
  const requirementsText = requirementsData
    .map((req) => {
      const questionsAndAnswers = req.questions
        .map((q, idx) => `**Q${idx + 1}**: ${q.question}\n**A${idx + 1}**: ${q.answer}`)
        .join('\n\n');
      
      return `
## 요건: ${req.title}
**설명**: ${req.description}

**확인된 내용:**
${questionsAndAnswers}

---`;
    })
    .join('\n');

  const userPrompt = `프로젝트: ${projectTitle}
설명: ${projectDescription}

아래 요구사항과 답변을 바탕으로 PRD를 작성하세요:

${requirementsText}

**중요**: 
1. 각 요건의 답변 내용에서 구체적인 정책/기준을 도출하여 표로 정리하세요
2. "답변 기반 정책" 표에서 답변 내용을 근거로 명시하세요
3. 실무에서 바로 참고할 수 있는 수준으로 작성하세요
4. 모든 내용을 표 형식으로 정리하세요`;

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    apiKey,
    baseURL
  );

  return { content };
}
