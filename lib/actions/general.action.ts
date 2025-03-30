"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db, usingMock } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  try {
    // If we're in mock mode or using fallback authentication, return mock data
    if (isMockMode() || userId === 'mock-user-id' || userId === 'fallback-user-id' || 
        interviewId.startsWith('mock-')) {
      console.log("Using mock data for getFeedbackByInterviewId");
      
      // If interview ID starts with "mock-interview-1", return feedback
      // Otherwise return null to simulate no feedback yet
      if (interviewId === 'mock-interview-1' || interviewId === 'mock-public-interview-1') {
        return {
          id: `mock-feedback-for-${interviewId}`,
          interviewId: interviewId,
          totalScore: 85,
          categoryScores: [
            { name: "Technical Knowledge", score: 90, comment: "Strong technical foundation" },
            { name: "Communication", score: 80, comment: "Clear but could improve conciseness" }
          ],
          strengths: ["Problem-solving skills", "Technical knowledge", "Enthusiasm"],
          areasForImprovement: ["Could provide more concise answers", "Consider more edge cases"],
          finalAssessment: "Overall strong candidate with good technical skills and communication.",
          createdAt: new Date().toISOString()
        };
      }
      
      return null;
    }

    const querySnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (querySnapshot.empty) return null;

    const feedbackDoc = querySnapshot.docs[0];
    return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return null;
  }
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  try {
    // If we're in mock mode or using fallback authentication, return mock data
    if (isMockMode() || userId === 'mock-user-id' || userId === 'fallback-user-id') {
      console.log("Using mock data for getLatestInterviews");
      return [
        {
          id: "mock-public-interview-1",
          role: "Full Stack Developer",
          level: "Senior",
          questions: ["What is your experience with microservices?", "How do you handle technical debt?"],
          techstack: ["React", "Node.js", "MongoDB"],
          createdAt: new Date().toISOString(),
          userId: "other-user-1",
          type: "technical",
          finalized: true
        },
        {
          id: "mock-public-interview-2",
          role: "DevOps Engineer",
          level: "Mid-level",
          questions: ["Explain CI/CD pipeline", "How do you monitor application performance?"],
          techstack: ["Docker", "Kubernetes", "Jenkins"],
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          userId: "other-user-2",
          type: "technical",
          finalized: true
        },
        {
          id: "mock-public-interview-3",
          role: "Product Manager",
          level: "Senior",
          questions: ["How do you prioritize features?", "Describe your approach to user research"],
          techstack: ["Agile", "Scrum", "JIRA"],
          createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          userId: "other-user-3",
          type: "behavioral",
          finalized: true
        }
      ];
    }

    // Simple query with only one ordering field and no inequality filters
    const interviews = await db
      .collection("interviews")
      .where("finalized", "==", true)
      .get();

    // Define interface for document data
    interface InterviewData {
      userId: string;
      createdAt: string;
      [key: string]: any;
    }

    // Filter and sort in memory
    const filteredInterviews = interviews.docs
      .filter((doc: any) => {
        const data = doc.data() as InterviewData;
        return data.userId !== userId;
      })
      .sort((a: any, b: any) => {
        const dateA = new Date((a.data() as InterviewData).createdAt || 0);
        const dateB = new Date((b.data() as InterviewData).createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // descending order
      })
      .slice(0, limit);

    return filteredInterviews.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
  } catch (error) {
    console.error("Error fetching latest interviews:", error);
    return [];
  }
}

export async function getInterviewsByUserId(
  userId: string | undefined
): Promise<Interview[] | null> {
  // If userId is undefined, return an empty array
  if (!userId) {
    return [];
  }

  try {
    // If we're in mock mode or using fallback authentication, return mock data
    if (isMockMode() || userId === 'mock-user-id' || userId === 'fallback-user-id') {
      console.log("Using mock data for getInterviewsByUserId");
      return [
        {
          id: "mock-interview-1",
          role: "Frontend Developer",
          level: "Mid-level",
          questions: ["Tell me about yourself", "What are your strengths?"],
          techstack: ["React", "TypeScript"],
          createdAt: new Date().toISOString(),
          userId: userId,
          type: "technical",
          finalized: true
        },
        {
          id: "mock-interview-2",
          role: "Backend Developer",
          level: "Senior",
          questions: ["Describe a challenging project", "How do you handle deadlines?"],
          techstack: ["Node.js", "Express"],
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          userId: userId,
          type: "behavioral",
          finalized: false
        }
      ];
    }

    // Simple query with only equality filters and no ordering
    const interviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    // Define interface for document data
    interface InterviewData {
      createdAt: string;
      [key: string]: any;
    }

    // Sort in memory
    const sortedInterviews = interviews.docs
      .sort((a: any, b: any) => {
        const dateA = new Date((a.data() as InterviewData).createdAt || 0);
        const dateB = new Date((b.data() as InterviewData).createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // descending order
      });

    return sortedInterviews.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
  } catch (error) {
    console.error("Error fetching interviews by user ID:", error);
    return [];
  }
}

// Check if we're using mock implementation
function isMockMode() {
  return process.env.NODE_ENV === "development" || usingMock;
}
