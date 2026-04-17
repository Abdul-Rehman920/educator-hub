export type StudentBookingStatus = "Pending" | "Confirmed" | "Paid" | "Completed";
export type StudentSessionType = "Demo" | "Private" | "Group";

export interface StudentBooking {
  id: string;
  tutorName: string;
  tutorAvatar?: string;
  tutorRating: number;
  tutorReviews: number;
  tutorLanguages: string[];
  tutorBio: string;
  subject: string;
  educationStandard: string;
  bookingId: string;
  date: string;
  timeSlot: string;
  duration: string;
  sessionType: StudentSessionType;
  ratePerHourPrivate: number;
  ratePerHourGroup: number;
  totalFee: number;
  status: StudentBookingStatus;
}

export const mockStudentBookings: StudentBooking[] = [
  {
    id: "sb-1",
    tutorName: "Dr. Ananya Iyer",
    tutorRating: 4.9,
    tutorReviews: 189,
    tutorLanguages: ["English", "Hindi"],
    tutorBio: "PhD in Mathematics with 12 years of teaching experience. Specializes in calculus, algebra, and competitive math preparation for students aiming for top universities.",
    subject: "Mathematics",
    educationStandard: "Grade 11",
    bookingId: "SB-20401",
    date: "2026-03-20",
    timeSlot: "10:00 AM - 11:00 AM",
    duration: "1 hour",
    sessionType: "Private",
    ratePerHourPrivate: 45,
    ratePerHourGroup: 28,
    totalFee: 45,
    status: "Confirmed",
  },
  {
    id: "sb-2",
    tutorName: "Prof. William Carter",
    tutorRating: 4.7,
    tutorReviews: 134,
    tutorLanguages: ["English"],
    tutorBio: "Former university lecturer in Physics with a passion for making complex concepts accessible. Published researcher in quantum mechanics.",
    subject: "Physics",
    educationStandard: "A-Level",
    bookingId: "SB-20402",
    date: "2026-03-20",
    timeSlot: "2:00 PM - 3:00 PM",
    duration: "1 hour",
    sessionType: "Group",
    ratePerHourPrivate: 50,
    ratePerHourGroup: 30,
    totalFee: 30,
    status: "Pending",
  },
  {
    id: "sb-3",
    tutorName: "Ms. Priya Sharma",
    tutorRating: 5.0,
    tutorReviews: 76,
    tutorLanguages: ["English", "Hindi", "Gujarati"],
    tutorBio: "Passionate chemistry educator with a knack for organic chemistry. Helps students build strong foundations through visual learning techniques.",
    subject: "Chemistry",
    educationStandard: "GCSE",
    bookingId: "SB-20403",
    date: "2026-03-22",
    timeSlot: "9:00 AM - 10:00 AM",
    duration: "1 hour",
    sessionType: "Demo",
    ratePerHourPrivate: 40,
    ratePerHourGroup: 25,
    totalFee: 0,
    status: "Confirmed",
  },
  {
    id: "sb-4",
    tutorName: "Dr. Ananya Iyer",
    tutorRating: 4.9,
    tutorReviews: 189,
    tutorLanguages: ["English", "Hindi"],
    tutorBio: "PhD in Mathematics with 12 years of teaching experience. Specializes in calculus, algebra, and competitive math preparation for students aiming for top universities.",
    subject: "Mathematics",
    educationStandard: "Grade 11",
    bookingId: "SB-20404",
    date: "2026-03-25",
    timeSlot: "10:00 AM - 11:00 AM",
    duration: "1 hour",
    sessionType: "Private",
    ratePerHourPrivate: 45,
    ratePerHourGroup: 28,
    totalFee: 45,
    status: "Pending",
  },
  {
    id: "sb-5",
    tutorName: "Mr. James Okonkwo",
    tutorRating: 4.8,
    tutorReviews: 92,
    tutorLanguages: ["English", "Yoruba"],
    tutorBio: "Software engineer turned educator. Teaches programming fundamentals and computer science theory with real-world project-based approaches.",
    subject: "Computer Science",
    educationStandard: "Grade 12",
    bookingId: "SB-20405",
    date: "2026-03-19",
    timeSlot: "4:00 PM - 5:00 PM",
    duration: "1 hour",
    sessionType: "Private",
    ratePerHourPrivate: 55,
    ratePerHourGroup: 35,
    totalFee: 55,
    status: "Completed",
  },
  {
    id: "sb-6",
    tutorName: "Prof. William Carter",
    tutorRating: 4.7,
    tutorReviews: 134,
    tutorLanguages: ["English"],
    tutorBio: "Former university lecturer in Physics with a passion for making complex concepts accessible. Published researcher in quantum mechanics.",
    subject: "Physics",
    educationStandard: "A-Level",
    bookingId: "SB-20406",
    date: "2026-03-15",
    timeSlot: "11:00 AM - 12:00 PM",
    duration: "1 hour",
    sessionType: "Private",
    ratePerHourPrivate: 50,
    ratePerHourGroup: 30,
    totalFee: 50,
    status: "Completed",
  },
  {
    id: "sb-7",
    tutorName: "Ms. Elena Rossi",
    tutorRating: 4.6,
    tutorReviews: 58,
    tutorLanguages: ["English", "Italian", "French"],
    tutorBio: "Multilingual language tutor specializing in English literature and creative writing. Encourages critical thinking through engaging discussions.",
    subject: "English Literature",
    educationStandard: "GCSE",
    bookingId: "SB-20407",
    date: "2026-03-27",
    timeSlot: "3:00 PM - 4:00 PM",
    duration: "1 hour",
    sessionType: "Group",
    ratePerHourPrivate: 38,
    ratePerHourGroup: 22,
    totalFee: 22,
    status: "Pending",
  },
];
