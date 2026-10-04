import { useEffect, useState } from "react";
import "./App.css";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  auth,
  db,
  googleProvider,
} from "./firebase";

/* =========================================================
   TYPES
   ========================================================= */

type UserRole =
  | "admin"
  | "instructor"
  | "trainee";

type UserProfile = {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  stores: string[];
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  stores: string[];
};

type Store = {
  id: string;
  name: string;
  address: string;
};

type TraineeStatus =
  | "training"
  | "observation"
  | "certified";

type CourseType =
  | "practical"
  | "scenario"
  | "knowledge";

type Trainee = {
  id: number;
  firestoreId?: string;
  employeeId: string;
  name: string;
  startDate: string;
  position: "正職" | "計時";
  storeId: string;
  instructor: string;
  secondInstructor?: string;
  plannedFinishDate?: string;
  note?: string;
  status: TraineeStatus;
};

type Course = {
  id: string;
  title: string;
  description: string;
  completion: string;
  type: CourseType;
  onsiteOnly?: boolean;
  items: string[];
  stages: string[];
};

type TrainingRecord = {
  id: number;
  firestoreId?: string;
  traineeId: number;
  courseId: string;
  courseTitle: string;
  instructor: string;
  fromStage: string;
  toStage: string;
  completedItems: string[];
  note: string;
  date: string;
  time: string;
};

type ExamQuestion = {
  id: string;
  courseId: string;
  question: string;
  options: string[];
  correctAnswer: number;
};

type ExamAttempt = {
  id: number;
  firestoreId?: string;
  traineeId: number;
  courseId: string;
  score: number;
  passed: boolean;
  date: string;
  time: string;
};

/* =========================================================
   STORES
   ========================================================= */

const stores: Store[] = [
  {
    id: "ntu",
    name: "微風台大店",
    address: "台大醫院東址地下街",
  },
  {
    id: "eslite",
    name: "誠品南西店",
    address: "中山站・誠品生活南西",
  },
];

/* =========================================================
   COURSE STAGES
   ========================================================= */

const PRACTICAL_STAGES = [
  "未教學",
  "教官示範",
  "陪同操作",
  "獨立操作",
  "Instructor 簽核",
];

const SCENARIO_STAGES = [
  "未教學",
  "教官說明",
  "情境演練",
  "Instructor 檢核",
];

const KNOWLEDGE_STAGES = [
  "未學習",
  "完成學習",
  "測驗",
  "通過",
];

/* =========================================================
   COURSES
   ========================================================= */

const courses: Course[] = [
  {
    id: "basic",
    title: "新人基本認識",
    description:
      "熟悉分店環境、工作規範與基本制度",
    completion:
      "完成學習＋測驗 80 分以上",
    type: "knowledge",
    stages: KNOWLEDGE_STAGES,
    items: [
      "分店環境介紹",
      "置物區與員工用品",
      "打卡方式",
      "上下班基本規範",
      "工作服裝與儀容",
      "基本工作分配",
    ],
  },

  {
    id: "product",
    title: "產品與菜單認識",
    description:
      "了解商品內容、價格與顧客常見問題",
    completion:
      "完成學習＋測驗 80 分以上",
    type: "knowledge",
    stages: KNOWLEDGE_STAGES,
    items: [
      "商品名稱",
      "主要食材",
      "商品售價",
      "商品差異",
      "售罄時如何回覆",
      "推薦商品方式",
      "常見顧客問題",
    ],
  },

  {
    id: "pos",
    title: "POS 系統操作",
    description:
      "點餐、付款、取消、退款、發票與關帳",
    completion:
      "實機操作＋Instructor 簽核",
    type: "practical",
    onsiteOnly: true,
    stages: PRACTICAL_STAGES,
    items: [
      "POS 開機",
      "員工登入",
      "一般商品點餐",
      "商品加購／加料",
      "修改商品",
      "刪除商品",
      "現金結帳",
      "信用卡結帳",
      "電子支付",
      "活動與折扣操作",
      "取消交易",
      "信用卡取消交易",
      "退款處理",
      "發票處理",
      "重印明細",
      "POS 異常處理",
      "對帳",
      "日結",
      "閉店關帳",
      "異常金額處理",
    ],
  },

  {
    id: "production",
    title: "出餐流程",
    description:
      "正確完成接單、製作、核對與交餐",
    completion:
      "實際操作＋Instructor 簽核",
    type: "practical",
    stages: PRACTICAL_STAGES,
    items: [
      "確認訂單",
      "取用正確包材",
      "依標準份量出餐",
      "確認餐點完整",
      "核對訂單",
      "正確交付顧客",
    ],
  },

  {
    id: "service",
    title: "顧客服務",
    description:
      "建立一致且友善的顧客服務流程",
    completion:
      "情境演練＋Instructor 檢核",
    type: "scenario",
    stages: SCENARIO_STAGES,
    items: [
      "主動招呼",
      "詢問顧客需求",
      "商品推薦",
      "排隊顧客應對",
      "結帳溝通",
      "交餐禮貌",
    ],
  },

  {
    id: "complaint",
    title: "客訴處理",
    description:
      "面對商品問題與顧客情緒時的處理方式",
    completion:
      "情境演練＋Instructor 檢核",
    type: "scenario",
    stages: SCENARIO_STAGES,
    items: [
      "先傾聽顧客問題",
      "確認問題內容",
      "避免與顧客爭辯",
      "商品錯誤處理",
      "退款需求處理",
      "情緒較大顧客應對",
      "何時通知店長",
    ],
  },

  {
    id: "opening",
    title: "開店作業",
    description:
      "營業前完整準備",
    completion:
      "實際操作＋Instructor 簽核",
    type: "practical",
    stages: PRACTICAL_STAGES,
    items: [
      "設備開機",
      "POS 準備",
      "清潔確認",
      "商品備貨",
      "包材備貨",
      "工作區確認",
      "營業前最後檢查",
    ],
  },

  {
    id: "closing",
    title: "閉店作業",
    description:
      "閉店清潔、盤點與關帳",
    completion:
      "實際操作＋Instructor 簽核",
    type: "practical",
    stages: PRACTICAL_STAGES,
    items: [
      "剩餘商品確認",
      "商品保存",
      "清潔工作台",
      "設備清潔",
      "垃圾處理",
      "包材盤點",
      "商品盤點",
      "POS 對帳",
      "關帳",
      "設備關機",
      "閉店最後檢查",
    ],
  },

  {
    id: "emergency",
    title: "緊急事件處理",
    description:
      "遇到突發狀況時知道該怎麼處理",
    completion:
      "情境演練＋Instructor 檢核",
    type: "scenario",
    stages: SCENARIO_STAGES,
    items: [
      "員工受傷",
      "顧客受傷",
      "顧客暈倒",
      "設備故障",
      "停電",
      "POS 無法使用",
      "漏水",
      "火災或異常氣味",
      "立即回報主管",
    ],
  },

  {
    id: "policy",
    title: "公司制度",
    description:
      "出勤、請假、排班與薪資流程",
    completion:
      "完成學習＋測驗 80 分以上",
    type: "knowledge",
    stages: KNOWLEDGE_STAGES,
    items: [
      "排班規則",
      "請假流程",
      "遲到通報",
      "臨時無法上班處理",
      "薪資發放時間",
      "出勤紀錄",
      "工作聯絡方式",
    ],
  },
];

/* =========================================================
   EXAM QUESTIONS
   ========================================================= */

const examQuestions: ExamQuestion[] = [
  {
    id: "basic-1",
    courseId: "basic",
    question:
      "開始工作前，最重要的第一件事是什麼？",
    options: [
      "直接開始出餐",
      "確認當日工作內容與工作區",
      "先休息",
      "先自行決定今天做什麼",
    ],
    correctAnswer: 1,
  },

  {
    id: "basic-2",
    courseId: "basic",
    question:
      "如果不確定某項工作的正確做法，應該怎麼處理？",
    options: [
      "自己猜",
      "先不要做並直接離開",
      "詢問 Instructor 或主管",
      "請顧客決定",
    ],
    correctAnswer: 2,
  },

  {
    id: "basic-3",
    courseId: "basic",
    question:
      "關於工作服裝與儀容，下列哪一項最正確？",
    options: [
      "只要自己覺得舒服即可",
      "依分店與公司規範整理",
      "沒有任何規定",
      "只有店長需要注意",
    ],
    correctAnswer: 1,
  },

  {
    id: "basic-4",
    courseId: "basic",
    question:
      "新人對工作區環境還不熟悉時，應該怎麼做？",
    options: [
      "自行移動所有物品",
      "先由 Instructor 帶領熟悉環境",
      "不用了解",
      "等顧客詢問再處理",
    ],
    correctAnswer: 1,
  },

  {
    id: "basic-5",
    courseId: "basic",
    question:
      "上下班與出勤紀錄應該依照什麼執行？",
    options: [
      "自己的習慣",
      "同事口頭決定",
      "公司與分店規範",
      "不需要紀錄",
    ],
    correctAnswer: 2,
  },

  {
    id: "product-1",
    courseId: "product",
    question:
      "顧客詢問商品內容，但你不確定時，正確做法是？",
    options: [
      "自行猜測",
      "隨便回答",
      "確認商品資料或詢問 Instructor",
      "直接說不知道",
    ],
    correctAnswer: 2,
  },

  {
    id: "product-2",
    courseId: "product",
    question:
      "商品售罄時，較合適的服務方式是？",
    options: [
      "不回應",
      "直接說沒有",
      "說明售罄並協助推薦其他商品",
      "要求顧客改天再來",
    ],
    correctAnswer: 2,
  },

  {
    id: "product-3",
    courseId: "product",
    question:
      "推薦商品時最重要的是什麼？",
    options: [
      "只推最貴的",
      "依照顧客需求介紹",
      "一定要要求顧客加購",
      "只推薦自己喜歡的",
    ],
    correctAnswer: 1,
  },

  {
    id: "product-4",
    courseId: "product",
    question:
      "對商品內容不熟悉，可能造成哪個問題？",
    options: [
      "資訊提供錯誤",
      "完全沒有影響",
      "只影響同事",
      "只影響 POS",
    ],
    correctAnswer: 0,
  },

  {
    id: "product-5",
    courseId: "product",
    question:
      "新人學習產品時，除了商品名稱之外還應該了解什麼？",
    options: [
      "主要食材與商品差異",
      "只有包裝顏色",
      "只有商品照片",
      "不用了解其他內容",
    ],
    correctAnswer: 0,
  },

  {
    id: "policy-1",
    courseId: "policy",
    question:
      "臨時無法上班時，第一步應該怎麼做？",
    options: [
      "不需要通知",
      "依公司流程立即聯絡主管",
      "隔天再說",
      "只告訴其他新人",
    ],
    correctAnswer: 1,
  },

  {
    id: "policy-2",
    courseId: "policy",
    question:
      "需要請假時，應依照什麼方式處理？",
    options: [
      "依公司請假流程",
      "直接不到班",
      "請顧客轉達",
      "不用紀錄",
    ],
    correctAnswer: 0,
  },

  {
    id: "policy-3",
    courseId: "policy",
    question:
      "發現自己可能遲到時，較適合的做法是？",
    options: [
      "抵達後再說",
      "事先依規定通知",
      "完全不通知",
      "請其他新人代為打卡",
    ],
    correctAnswer: 1,
  },

  {
    id: "policy-4",
    courseId: "policy",
    question:
      "出勤紀錄的重要性是什麼？",
    options: [
      "沒有用途",
      "作為工作與薪資相關紀錄",
      "只有新人需要",
      "只用來看誰最早到",
    ],
    correctAnswer: 1,
  },

  {
    id: "policy-5",
    courseId: "policy",
    question:
      "遇到不清楚的制度問題，應該怎麼處理？",
    options: [
      "自行假設",
      "詢問主管或 Instructor 確認",
      "依網路文章決定",
      "不用處理",
    ],
    correctAnswer: 1,
  },
];

/* =========================================================
   APP
   ========================================================= */

function App() {
  /* =========================================================
     AUTH
     ========================================================= */

  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [
    profileLoading,
    setProfileLoading,
  ] =
    useState(false);

  const [
    profileError,
    setProfileError,
  ] =
    useState<
      | "not-found"
      | "inactive"
      | "error"
      | null
    >(null);

  const [signingIn, setSigningIn] =
    useState(false);

  /* =========================================================
     PAGE
     ========================================================= */

  const [page, setPage] =
    useState("welcome");

  const [store, setStore] =
    useState<Store | null>(null);

  const [
    selectedTrainee,
    setSelectedTrainee,
  ] =
    useState<Trainee | null>(
      null
    );

  const [
    selectedCourse,
    setSelectedCourse,
  ] =
    useState<Course | null>(
      null
    );

  /* =========================================================
     TRAINING DATA
     ========================================================= */

  const [trainees, setTrainees] =
    useState<Trainee[]>([]);

  const [
    courseStages,
    setCourseStages,
  ] =
    useState<
      Record<string, number>
    >({});

  const [
    courseNotes,
    setCourseNotes,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    checkedItems,
    setCheckedItems,
  ] =
    useState<
      Record<string, string[]>
    >({});

  const [
    trainingRecords,
    setTrainingRecords,
  ] =
    useState<
      TrainingRecord[]
    >([]);

  const [
    examAttempts,
    setExamAttempts,
  ] =
    useState<
      ExamAttempt[]
    >([]);

  const [
    examAnswers,
    setExamAnswers,
  ] =
    useState<
      Record<string, number>
    >({});

  const [
    examResult,
    setExamResult,
  ] =
    useState<{
      score: number;
      passed: boolean;
    } | null>(null);

  const [
    loadingData,
    setLoadingData,
  ] =
    useState(false);

  /* =========================================================
     NEW TRAINEE FORM
     ========================================================= */

  const [
    newTrainee,
    setNewTrainee,
  ] =
    useState({
      employeeId: "",
      name: "",
      startDate: "",
      position: "計時",
      instructor: "",
      secondInstructor: "",
      plannedFinishDate: "",
      note: "",
    });

  /* =========================================================
     ADMIN DATA
     ========================================================= */

  const [
    adminUsers,
    setAdminUsers,
  ] =
    useState<
      AdminUser[]
    >([]);

  const [
    adminLoading,
    setAdminLoading,
  ] =
    useState(false);

  const [
    adminSaving,
    setAdminSaving,
  ] =
    useState(false);

  const [
    newInstructor,
    setNewInstructor,
  ] =
    useState({
      name: "",
      email: "",
      stores: [] as string[],
    });

  /* =========================================================
     AUTH LISTENER
     ========================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          firebaseUser
        ) => {
          setUser(
            firebaseUser
          );

          setProfile(null);
          setProfileError(null);

          if (
            !firebaseUser
          ) {
            setAuthLoading(
              false
            );

            return;
          }

          setProfileLoading(
            true
          );

          try {
            const email =
              firebaseUser.email
                ?.trim()
                .toLowerCase();

            if (!email) {
              setProfileError(
                "error"
              );

              return;
            }

            const userRef =
              doc(
                db,
                "users",
                email
              );

            const snapshot =
              await getDoc(
                userRef
              );

            if (
              !snapshot.exists()
            ) {
              setProfileError(
                "not-found"
              );

              return;
            }

            const data =
              snapshot.data();

            if (
              data.active !==
              true
            ) {
              setProfileError(
                "inactive"
              );

              return;
            }

            const role: UserRole =
              data.role ===
              "admin"
                ? "admin"
                : data.role ===
                    "trainee"
                ? "trainee"
                : "instructor";

            setProfile({
              name:
                data.name ||
                firebaseUser.displayName ||
                email,

              email:
                data.email ||
                email,

              role,

              active:
                true,

              stores:
                Array.isArray(
                  data.stores
                )
                  ? data.stores
                  : [],
            });
          } catch (
            error
          ) {
            console.error(
              "讀取帳號權限失敗：",
              error
            );

            setProfileError(
              "error"
            );
          } finally {
            setProfileLoading(
              false
            );

            setAuthLoading(
              false
            );
          }
        }
      );

    return unsubscribe;
  }, []);

  /* =========================================================
     CURRENT USER NAME
     ========================================================= */

  const currentInstructorName =
    profile?.name ||
    user?.displayName ||
    "Instructor";

  useEffect(() => {
    if (!profile) {
      return;
    }

    setNewTrainee(
      (prev) => ({
        ...prev,
        instructor:
          profile.name,
      })
    );
  }, [profile]);

  /* =========================================================
     LOAD TRAINING DATA
     ========================================================= */

  useEffect(() => {
    if (!profile) {
      return;
    }

    const loadAllData =
      async () => {
        setLoadingData(true);

        try {
          const [
            traineeSnapshot,
            progressSnapshot,
            recordSnapshot,
            attemptSnapshot,
          ] =
            await Promise.all([
              getDocs(
                collection(
                  db,
                  "trainees"
                )
              ),

              getDocs(
                collection(
                  db,
                  "courseProgress"
                )
              ),

              getDocs(
                collection(
                  db,
                  "trainingRecords"
                )
              ),

              getDocs(
                collection(
                  db,
                  "examAttempts"
                )
              ),
            ]);

          const loadedTrainees: Trainee[] =
            traineeSnapshot.docs.map(
              (
                item,
                index
              ) => {
                const data =
                  item.data();

                return {
                  id:
                    typeof data.localId ===
                    "number"
                      ? data.localId
                      : Date.now() +
                        index,

                  firestoreId:
                    item.id,

                  employeeId:
                    data.employeeId ||
                    "",

                  name:
                    data.name ||
                    "",

                  startDate:
                    data.startDate ||
                    "",

                  position:
                    data.position ===
                    "正職"
                      ? "正職"
                      : "計時",

                  storeId:
                    data.storeId ||
                    "",

                  instructor:
                    data.instructor ||
                    "",

                  secondInstructor:
                    data.secondInstructor ||
                    "",

                  plannedFinishDate:
                    data.plannedFinishDate ||
                    "",

                  note:
                    data.note ||
                    "",

                  status:
                    data.status ===
                    "certified"
                      ? "certified"
                      : data.status ===
                          "observation"
                      ? "observation"
                      : "training",
                };
              }
            );

          setTrainees(
            loadedTrainees
          );

          const loadedStages: Record<
            string,
            number
          > = {};

          const loadedChecks: Record<
            string,
            string[]
          > = {};

          const loadedNotes: Record<
            string,
            string
          > = {};

          progressSnapshot.docs.forEach(
            (item) => {
              const data =
                item.data();

              const key =
                `${data.traineeId}-${data.courseId}`;

              loadedStages[
                key
              ] =
                typeof data.stage ===
                "number"
                  ? data.stage
                  : 0;

              loadedChecks[
                key
              ] =
                Array.isArray(
                  data.checkedItems
                )
                  ? data.checkedItems
                  : [];

              loadedNotes[
                key
              ] =
                data.note ||
                "";
            }
          );

          setCourseStages(
            loadedStages
          );

          setCheckedItems(
            loadedChecks
          );

          setCourseNotes(
            loadedNotes
          );

          const loadedRecords: TrainingRecord[] =
            recordSnapshot.docs.map(
              (
                item,
                index
              ) => {
                const data =
                  item.data();

                return {
                  id:
                    typeof data.localId ===
                    "number"
                      ? data.localId
                      : Date.now() +
                        index,

                  firestoreId:
                    item.id,

                  traineeId:
                    data.traineeId,

                  courseId:
                    data.courseId,

                  courseTitle:
                    data.courseTitle ||
                    "",

                  instructor:
                    data.instructor ||
                    "",

                  fromStage:
                    data.fromStage ||
                    "",

                  toStage:
                    data.toStage ||
                    "",

                  completedItems:
                    Array.isArray(
                      data.completedItems
                    )
                      ? data.completedItems
                      : [],

                  note:
                    data.note ||
                    "",

                  date:
                    data.date ||
                    "",

                  time:
                    data.time ||
                    "",
                };
              }
            );

          loadedRecords.sort(
            (a, b) =>
              b.id -
              a.id
          );

          setTrainingRecords(
            loadedRecords
          );

          const loadedAttempts: ExamAttempt[] =
            attemptSnapshot.docs.map(
              (
                item,
                index
              ) => {
                const data =
                  item.data();

                return {
                  id:
                    typeof data.localId ===
                    "number"
                      ? data.localId
                      : Date.now() +
                        index,

                  firestoreId:
                    item.id,

                  traineeId:
                    data.traineeId,

                  courseId:
                    data.courseId,

                  score:
                    Number(
                      data.score
                    ) || 0,

                  passed:
                    data.passed ===
                    true,

                  date:
                    data.date ||
                    "",

                  time:
                    data.time ||
                    "",
                };
              }
            );

          loadedAttempts.sort(
            (a, b) =>
              b.id -
              a.id
          );

          setExamAttempts(
            loadedAttempts
          );
        } catch (
          error
        ) {
          console.error(
            "讀取訓練資料失敗：",
            error
          );

          alert(
            "訓練資料讀取失敗，請截圖給我。"
          );
        } finally {
          setLoadingData(
            false
          );
        }
      };

    loadAllData();
  }, [profile]);

  /* =========================================================
     GOOGLE LOGIN
     ========================================================= */

  const handleGoogleLogin =
    async () => {
      try {
        setSigningIn(
          true
        );

        await signInWithPopup(
          auth,
          googleProvider
        );
      } catch (
        error: any
      ) {
        console.error(
          error
        );

        if (
          error?.code ===
          "auth/popup-closed-by-user"
        ) {
          alert(
            "Google 登入視窗被關閉，可以再試一次。"
          );
        } else {
          alert(
            `Google 登入失敗。\n\n${
              error?.code ||
              error?.message ||
              "未知錯誤"
            }`
          );
        }
      } finally {
        setSigningIn(
          false
        );
      }
    };

  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout =
    async () => {
      try {
        await signOut(
          auth
        );

        setPage(
          "welcome"
        );

        setStore(
          null
        );

        setSelectedTrainee(
          null
        );

        setSelectedCourse(
          null
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        alert(
          "登出失敗，請再試一次。"
        );
      }
    };

  /* =========================================================
     ALLOWED STORES
     ========================================================= */

  const allowedStores =
    profile?.role ===
    "admin"
      ? stores
      : stores.filter(
          (item) =>
            profile?.stores.includes(
              item.id
            )
        );

  /* =========================================================
     FIRESTORE HELPERS
     ========================================================= */

  const saveCourseProgress =
    async (
      traineeId: number,
      courseId: string,
      stage: number,
      items: string[],
      note: string
    ) => {
      const progressId =
        `${traineeId}_${courseId}`;

      await setDoc(
        doc(
          db,
          "courseProgress",
          progressId
        ),
        {
          traineeId,
          courseId,
          stage,
          checkedItems:
            items,
          note,
          updatedBy:
            currentInstructorName,
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    };

  const saveTrainingRecord =
    async (
      record: TrainingRecord
    ) => {
      const ref =
        await addDoc(
          collection(
            db,
            "trainingRecords"
          ),
          {
            localId:
              record.id,

            traineeId:
              record.traineeId,

            courseId:
              record.courseId,

            courseTitle:
              record.courseTitle,

            instructor:
              record.instructor,

            fromStage:
              record.fromStage,

            toStage:
              record.toStage,

            completedItems:
              record.completedItems,

            note:
              record.note,

            date:
              record.date,

            time:
              record.time,

            createdAt:
              serverTimestamp(),
          }
        );

      const saved = {
        ...record,
        firestoreId:
          ref.id,
      };

      setTrainingRecords(
        (prev) => [
          saved,
          ...prev,
        ]
      );
    };

  const saveExamAttempt =
    async (
      attempt: ExamAttempt
    ) => {
      const ref =
        await addDoc(
          collection(
            db,
            "examAttempts"
          ),
          {
            localId:
              attempt.id,

            traineeId:
              attempt.traineeId,

            courseId:
              attempt.courseId,

            score:
              attempt.score,

            passed:
              attempt.passed,

            date:
              attempt.date,

            time:
              attempt.time,

            createdAt:
              serverTimestamp(),
          }
        );

      const saved = {
        ...attempt,
        firestoreId:
          ref.id,
      };

      setExamAttempts(
        (prev) => [
          saved,
          ...prev,
        ]
      );
    };

  /* =========================================================
     COURSE CALCULATIONS
     ========================================================= */

  const getCourseStage = (
    traineeId: number,
    courseId: string
  ) => {
    return (
      courseStages[
        `${traineeId}-${courseId}`
      ] || 0
    );
  };

  const getCoursePercentage =
    (
      traineeId: number,
      course: Course
    ) => {
      const stageIndex =
        getCourseStage(
          traineeId,
          course.id
        );

      if (
        stageIndex ===
        0
      ) {
        return 0;
      }

      const maxIndex =
        course.stages.length -
        1;

      return Math.round(
        (stageIndex /
          maxIndex) *
          100
      );
    };

  const getTraineeProgress =
    (
      traineeId: number
    ) => {
      const total =
        courses.reduce(
          (
            sum,
            course
          ) =>
            sum +
            getCoursePercentage(
              traineeId,
              course
            ),
          0
        );

      return Math.round(
        total /
          courses.length
      );
    };

  const getCompletedCourseCount =
    (
      traineeId: number
    ) => {
      return courses.filter(
        (course) => {
          const stage =
            getCourseStage(
              traineeId,
              course.id
            );

          return (
            stage ===
            course.stages.length -
              1
          );
        }
      ).length;
    };

  const getNotStartedCourseCount =
    (
      traineeId: number
    ) => {
      return courses.filter(
        (course) =>
          getCourseStage(
            traineeId,
            course.id
          ) === 0
      ).length;
    };

  const getWaitingReviewCount =
    (
      traineeId: number
    ) => {
      return courses.filter(
        (course) => {
          const stage =
            getCourseStage(
              traineeId,
              course.id
            );

          if (
            course.type ===
            "practical"
          ) {
            return (
              stage ===
              3
            );
          }

          if (
            course.type ===
              "scenario" ||
            course.type ===
              "knowledge"
          ) {
            return (
              stage ===
              2
            );
          }

          return false;
        }
      ).length;
    };

  const getCourseTypeLabel =
    (
      type: CourseType
    ) => {
      if (
        type ===
        "practical"
      ) {
        return "實作型";
      }

      if (
        type ===
        "scenario"
      ) {
        return "情境型";
      }

      return "知識型";
    };

  /* =========================================================
     ADMIN FUNCTIONS
     ========================================================= */

  const loadAdminUsers =
    async () => {
      if (
        profile?.role !==
        "admin"
      ) {
        return;
      }

      setAdminLoading(
        true
      );

      try {
        const snapshot =
          await getDocs(
            collection(
              db,
              "users"
            )
          );

        const loaded: AdminUser[] =
          snapshot.docs.map(
            (item) => {
              const data =
                item.data();

              const role: UserRole =
                data.role ===
                "admin"
                  ? "admin"
                  : data.role ===
                      "trainee"
                  ? "trainee"
                  : "instructor";

              return {
                id:
                  item.id,

                name:
                  data.name ||
                  "",

                email:
                  data.email ||
                  item.id,

                role,

                active:
                  data.active ===
                  true,

                stores:
                  Array.isArray(
                    data.stores
                  )
                    ? data.stores
                    : [],
              };
            }
          );

        loaded.sort(
          (a, b) => {
            if (
              a.role ===
                "admin" &&
              b.role !==
                "admin"
            ) {
              return -1;
            }

            if (
              b.role ===
                "admin" &&
              a.role !==
                "admin"
            ) {
              return 1;
            }

            return a.name.localeCompare(
              b.name,
              "zh-TW"
            );
          }
        );

        setAdminUsers(
          loaded
        );
      } catch (
        error
      ) {
        console.error(
          "讀取帳號資料失敗：",
          error
        );

        alert(
          "帳號資料讀取失敗。"
        );
      } finally {
        setAdminLoading(
          false
        );
      }
    };

  useEffect(() => {
    if (
      page ===
        "admin" &&
      profile?.role ===
        "admin"
    ) {
      loadAdminUsers();
    }
  }, [page, profile?.role]);

  const toggleNewInstructorStore =
    (
      storeId: string
    ) => {
      setNewInstructor(
        (prev) => {
          const exists =
            prev.stores.includes(
              storeId
            );

          return {
            ...prev,

            stores:
              exists
                ? prev.stores.filter(
                    (id) =>
                      id !==
                      storeId
                  )
                : [
                    ...prev.stores,
                    storeId,
                  ],
          };
        }
      );
    };

  const createInstructor =
    async () => {
      const name =
        newInstructor.name.trim();

      const email =
        newInstructor.email
          .trim()
          .toLowerCase();

      if (!name) {
        alert(
          "請輸入 Instructor 姓名。"
        );

        return;
      }

      if (
        !email ||
        !email.includes("@")
      ) {
        alert(
          "請輸入正確的 Google Email。"
        );

        return;
      }

      if (
        newInstructor.stores
          .length === 0
      ) {
        alert(
          "請至少指定一間分店。"
        );

        return;
      }

      const existing =
        adminUsers.find(
          (item) =>
            item.email.toLowerCase() ===
            email
        );

      if (existing) {
        alert(
          "這個 Email 已經存在系統中。"
        );

        return;
      }

      setAdminSaving(
        true
      );

      try {
        await setDoc(
          doc(
            db,
            "users",
            email
          ),
          {
            name,

            email,

            role:
              "instructor",

            active:
              true,

            stores:
              newInstructor.stores,

            createdBy:
              profile?.email ||
              "",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        setNewInstructor(
          {
            name: "",
            email: "",
            stores: [],
          }
        );

        await loadAdminUsers();

        alert(
          `已新增 Instructor：${name} ✅`
        );
      } catch (
        error
      ) {
        console.error(
          "新增 Instructor 失敗：",
          error
        );

        alert(
          "新增 Instructor 失敗。"
        );
      } finally {
        setAdminSaving(
          false
        );
      }
    };

  const toggleAdminUserActive =
    async (
      person: AdminUser
    ) => {
      if (
        person.role ===
        "admin"
      ) {
        alert(
          "Admin 帳號暫時不允許在這裡停用，避免把管理員鎖在系統外。"
        );

        return;
      }

      const nextActive =
        !person.active;

      try {
        await setDoc(
          doc(
            db,
            "users",
            person.id
          ),
          {
            active:
              nextActive,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge:
              true,
          }
        );

        setAdminUsers(
          (prev) =>
            prev.map(
              (item) =>
                item.id ===
                person.id
                  ? {
                      ...item,

                      active:
                        nextActive,
                    }
                  : item
            )
        );
      } catch (
        error
      ) {
        console.error(
          "帳號狀態更新失敗：",
          error
        );

        alert(
          "帳號狀態更新失敗。"
        );
      }
    };

  const toggleExistingUserStore =
    async (
      person: AdminUser,
      storeId: string
    ) => {
      if (
        person.role ===
        "admin"
      ) {
        return;
      }

      const exists =
        person.stores.includes(
          storeId
        );

      const updatedStores =
        exists
          ? person.stores.filter(
              (id) =>
                id !==
                storeId
            )
          : [
              ...person.stores,
              storeId,
            ];

      if (
        updatedStores.length ===
        0
      ) {
        const confirmed =
          window.confirm(
            "這樣會讓這位 Instructor 沒有任何分店權限，確定嗎？"
          );

        if (!confirmed) {
          return;
        }
      }

      try {
        await setDoc(
          doc(
            db,
            "users",
            person.id
          ),
          {
            stores:
              updatedStores,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge:
              true,
          }
        );

        setAdminUsers(
          (prev) =>
            prev.map(
              (item) =>
                item.id ===
                person.id
                  ? {
                      ...item,

                      stores:
                        updatedStores,
                    }
                  : item
            )
        );
      } catch (
        error
      ) {
        console.error(
          "分店權限更新失敗：",
          error
        );

        alert(
          "分店權限更新失敗。"
        );
      }
    };

  /* =========================================================
     STORE
     ========================================================= */

  const chooseStore =
    (
      selectedStore: Store
    ) => {
      const allowed =
        allowedStores.some(
          (item) =>
            item.id ===
            selectedStore.id
        );

      if (!allowed) {
        alert(
          "你沒有這間分店的權限。"
        );

        return;
      }

      setStore(
        selectedStore
      );

      setPage(
        "dashboard"
      );
    };

  /* =========================================================
     NEW TRAINEE
     ========================================================= */

  const addTrainee =
    async () => {
      if (
        !newTrainee.employeeId.trim() ||
        !newTrainee.name.trim() ||
        !newTrainee.startDate ||
        !store
      ) {
        alert(
          "請完成員工編號、姓名、到職日與分店資料。"
        );

        return;
      }

      const localId =
        Date.now();

      const trainee: Trainee =
        {
          id:
            localId,

          employeeId:
            newTrainee.employeeId.trim(),

          name:
            newTrainee.name.trim(),

          startDate:
            newTrainee.startDate,

          position:
            newTrainee.position as
              | "正職"
              | "計時",

          storeId:
            store.id,

          instructor:
            currentInstructorName,

          secondInstructor:
            newTrainee.secondInstructor.trim(),

          plannedFinishDate:
            newTrainee.plannedFinishDate,

          note:
            newTrainee.note.trim(),

          status:
            "training",
        };

      try {
        const ref =
          await addDoc(
            collection(
              db,
              "trainees"
            ),
            {
              localId,

              employeeId:
                trainee.employeeId,

              name:
                trainee.name,

              startDate:
                trainee.startDate,

              position:
                trainee.position,

              storeId:
                trainee.storeId,

              instructor:
                trainee.instructor,

              secondInstructor:
                trainee.secondInstructor ||
                "",

              plannedFinishDate:
                trainee.plannedFinishDate ||
                "",

              note:
                trainee.note ||
                "",

              status:
                trainee.status,

              createdBy:
                currentInstructorName,

              createdByEmail:
                profile?.email ||
                "",

              createdAt:
                serverTimestamp(),
            }
          );

        setTrainees(
          (prev) => [
            ...prev,
            {
              ...trainee,

              firestoreId:
                ref.id,
            },
          ]
        );

        setNewTrainee(
          {
            employeeId:
              "",
            name: "",
            startDate:
              "",
            position:
              "計時",
            instructor:
              currentInstructorName,
            secondInstructor:
              "",
            plannedFinishDate:
              "",
            note: "",
          }
        );

        alert(
          `已建立 ${trainee.name} 的學習卡 ✅`
        );

        setPage(
          "dashboard"
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        alert(
          "建立新人失敗，請截圖給我。"
        );
      }
    };

  /* =========================================================
     STORE DATA
     ========================================================= */

  const currentStoreTrainees =
    trainees.filter(
      (person) =>
        person.storeId ===
        store?.id
    );

  const trainingCount =
    currentStoreTrainees.filter(
      (person) =>
        person.status !==
        "certified"
    ).length;

  const totalNotStarted =
    currentStoreTrainees.reduce(
      (
        sum,
        person
      ) =>
        sum +
        getNotStartedCourseCount(
          person.id
        ),
      0
    );

  const totalWaitingReview =
    currentStoreTrainees.reduce(
      (
        sum,
        person
      ) =>
        sum +
        getWaitingReviewCount(
          person.id
        ),
      0
    );

  /* =========================================================
     OPEN PAGES
     ========================================================= */

  const openLearningCard =
    (
      person: Trainee
    ) => {
      setSelectedTrainee(
        person
      );

      setPage(
        "learning-card"
      );
    };

  const openCourse =
    (
      course: Course
    ) => {
      setSelectedCourse(
        course
      );

      setExamResult(
        null
      );

      setExamAnswers(
        {}
      );

      setPage(
        "course"
      );
    };

  const courseKey =
    selectedTrainee &&
    selectedCourse
      ? `${selectedTrainee.id}-${selectedCourse.id}`
      : "";

  const currentStage =
    selectedTrainee &&
    selectedCourse
      ? getCourseStage(
          selectedTrainee.id,
          selectedCourse.id
        )
      : 0;

  const currentCheckedItems =
    checkedItems[
      courseKey
    ] || [];

  const checklistPercentage =
    selectedCourse &&
    selectedCourse.items
      .length > 0
      ? Math.round(
          (currentCheckedItems.length /
            selectedCourse.items.length) *
            100
        )
      : 0;

  /* =========================================================
     DATE TIME
     ========================================================= */

  const getDateTime =
    () => {
      const now =
        new Date();

      const date =
        new Intl.DateTimeFormat(
          "zh-TW",
          {
            year:
              "numeric",
            month:
              "2-digit",
            day:
              "2-digit",
          }
        ).format(
          now
        );

      const time =
        new Intl.DateTimeFormat(
          "zh-TW",
          {
            hour:
              "2-digit",
            minute:
              "2-digit",
            hour12:
              false,
          }
        ).format(
          now
        );

      return {
        date,
        time,
      };
    };

  /* =========================================================
     CHECKLIST
     ========================================================= */

  const toggleItem =
    async (
      item: string
    ) => {
      if (
        !courseKey ||
        !selectedTrainee ||
        !selectedCourse
      ) {
        return;
      }

      const current =
        checkedItems[
          courseKey
        ] || [];

      const updated =
        current.includes(
          item
        )
          ? current.filter(
              (x) =>
                x !==
                item
            )
          : [
              ...current,
              item,
            ];

      setCheckedItems(
        (prev) => ({
          ...prev,

          [courseKey]:
            updated,
        })
      );

      try {
        await saveCourseProgress(
          selectedTrainee.id,
          selectedCourse.id,
          currentStage,
          updated,
          courseNotes[
            courseKey
          ] || ""
        );
      } catch (
        error
      ) {
        console.error(
          "Checklist 儲存失敗：",
          error
        );

        alert(
          "Checklist 儲存失敗，請再試一次。"
        );
      }
    };

  /* =========================================================
     NOTE
     ========================================================= */

  const saveCurrentNote =
    async () => {
      if (
        !selectedTrainee ||
        !selectedCourse
      ) {
        return;
      }

      try {
        await saveCourseProgress(
          selectedTrainee.id,
          selectedCourse.id,
          currentStage,
          currentCheckedItems,
          courseNotes[
            courseKey
          ] || ""
        );
      } catch (
        error
      ) {
        console.error(
          "備註儲存失敗：",
          error
        );
      }
    };

  /* =========================================================
     PRACTICAL VALIDATION
     ========================================================= */

  const validatePracticalCourse =
    () => {
      const note =
        (
          courseNotes[
            courseKey
          ] || ""
        ).trim();

      if (
        currentStage ===
          0 &&
        currentCheckedItems.length <
          1
      ) {
        alert(
          "請至少完成 1 個教學項目。"
        );

        return false;
      }

      if (
        currentStage ===
          1 &&
        checklistPercentage <
          50
      ) {
        alert(
          "Checklist 至少完成 50% 才能進入陪同操作。"
        );

        return false;
      }

      if (
        currentStage ===
          2 &&
        checklistPercentage <
          100
      ) {
        alert(
          "Checklist 必須完成 100% 才能進入獨立操作。"
        );

        return false;
      }

      if (
        currentStage ===
        3
      ) {
        if (
          checklistPercentage <
          100
        ) {
          alert(
            "最終簽核前 Checklist 必須完成 100%。"
          );

          return false;
        }

        if (!note) {
          alert(
            "最終簽核前請填寫 Instructor 備註。"
          );

          return false;
        }
      }

      return true;
    };

  /* =========================================================
     SCENARIO VALIDATION
     ========================================================= */

  const validateScenarioCourse =
    () => {
      const note =
        (
          courseNotes[
            courseKey
          ] || ""
        ).trim();

      if (
        currentStage ===
          0 &&
        currentCheckedItems.length <
          1
      ) {
        alert(
          "請先完成至少 1 個教學項目。"
        );

        return false;
      }

      if (
        currentStage ===
          1 &&
        checklistPercentage <
          50
      ) {
        alert(
          "至少完成 50% 教學內容後，才能進行情境演練。"
        );

        return false;
      }

      if (
        currentStage ===
        2
      ) {
        if (
          checklistPercentage <
          100
        ) {
          alert(
            "Instructor 檢核前必須完成所有情境項目。"
          );

          return false;
        }

        if (!note) {
          alert(
            "請記錄本次情境演練結果。"
          );

          return false;
        }
      }

      return true;
    };

  /* =========================================================
     ADVANCE COURSE
     ========================================================= */

  const advanceCourseStage =
    async () => {
      if (
        !selectedTrainee ||
        !selectedCourse ||
        !courseKey
      ) {
        return;
      }

      if (
        selectedCourse.type ===
        "knowledge"
      ) {
        return;
      }

      let valid =
        false;

      if (
        selectedCourse.type ===
        "practical"
      ) {
        valid =
          validatePracticalCourse();
      }

      if (
        selectedCourse.type ===
        "scenario"
      ) {
        valid =
          validateScenarioCourse();
      }

      if (!valid) {
        return;
      }

      const newStage =
        Math.min(
          currentStage +
            1,
          selectedCourse.stages
            .length -
            1
        );

      if (
        newStage ===
        currentStage
      ) {
        return;
      }

      const {
        date,
        time,
      } =
        getDateTime();

      const record: TrainingRecord =
        {
          id:
            Date.now(),

          traineeId:
            selectedTrainee.id,

          courseId:
            selectedCourse.id,

          courseTitle:
            selectedCourse.title,

          instructor:
            currentInstructorName,

          fromStage:
            selectedCourse.stages[
              currentStage
            ],

          toStage:
            selectedCourse.stages[
              newStage
            ],

          completedItems:
            currentCheckedItems,

          note:
            courseNotes[
              courseKey
            ] ||
            "本次未填寫備註",

          date,
          time,
        };

      try {
        await saveCourseProgress(
          selectedTrainee.id,
          selectedCourse.id,
          newStage,
          currentCheckedItems,
          courseNotes[
            courseKey
          ] || ""
        );

        await saveTrainingRecord(
          record
        );

        setCourseStages(
          (prev) => ({
            ...prev,

            [courseKey]:
              newStage,
          })
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        alert(
          "訓練進度儲存失敗，請再試一次。"
        );
      }
    };

  /* =========================================================
     KNOWLEDGE COMPLETE
     ========================================================= */

  const completeKnowledgeLearning =
    async () => {
      if (
        !selectedTrainee ||
        !selectedCourse ||
        selectedCourse.type !==
          "knowledge"
      ) {
        return;
      }

      if (
        checklistPercentage <
        100
      ) {
        alert(
          "請先完成全部學習內容，再進入測驗。"
        );

        return;
      }

      const {
        date,
        time,
      } =
        getDateTime();

      const record: TrainingRecord =
        {
          id:
            Date.now(),

          traineeId:
            selectedTrainee.id,

          courseId:
            selectedCourse.id,

          courseTitle:
            selectedCourse.title,

          instructor:
            currentInstructorName,

          fromStage:
            "未學習",

          toStage:
            "完成學習",

          completedItems:
            currentCheckedItems,

          note:
            courseNotes[
              courseKey
            ] ||
            "已完成所有學習內容",

          date,
          time,
        };

      try {
        await saveCourseProgress(
          selectedTrainee.id,
          selectedCourse.id,
          1,
          currentCheckedItems,
          courseNotes[
            courseKey
          ] || ""
        );

        await saveTrainingRecord(
          record
        );

        setCourseStages(
          (prev) => ({
            ...prev,

            [courseKey]:
              1,
          })
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        alert(
          "學習進度儲存失敗。"
        );
      }
    };

  /* =========================================================
     START EXAM
     ========================================================= */

  const startExam =
    async () => {
      if (
        !selectedTrainee ||
        !selectedCourse
      ) {
        return;
      }

      if (
        selectedCourse.type !==
        "knowledge"
      ) {
        return;
      }

      if (
        currentStage ===
        0
      ) {
        alert(
          "請先完成所有學習內容。"
        );

        return;
      }

      if (
        currentStage ===
        1
      ) {
        const {
          date,
          time,
        } =
          getDateTime();

        const record: TrainingRecord =
          {
            id:
              Date.now(),

            traineeId:
              selectedTrainee.id,

            courseId:
              selectedCourse.id,

            courseTitle:
              selectedCourse.title,

            instructor:
              currentInstructorName,

            fromStage:
              "完成學習",

            toStage:
              "測驗",

            completedItems:
              currentCheckedItems,

            note:
              "進入測驗階段",

            date,
            time,
          };

        try {
          await saveCourseProgress(
            selectedTrainee.id,
            selectedCourse.id,
            2,
            currentCheckedItems,
            courseNotes[
              courseKey
            ] || ""
          );

          await saveTrainingRecord(
            record
          );

          setCourseStages(
            (prev) => ({
              ...prev,

              [courseKey]:
                2,
            })
          );
        } catch (
          error
        ) {
          console.error(
            error
          );

          alert(
            "進入測驗失敗，請再試一次。"
          );

          return;
        }
      }

      setExamAnswers(
        {}
      );

      setExamResult(
        null
      );

      setPage(
        "exam"
      );
    };

  const getCurrentExamQuestions =
    () => {
      if (
        !selectedCourse
      ) {
        return [];
      }

      return examQuestions.filter(
        (question) =>
          question.courseId ===
          selectedCourse.id
      );
    };

  /* =========================================================
     SUBMIT EXAM
     ========================================================= */

  const submitExam =
    async () => {
      if (
        !selectedCourse ||
        !selectedTrainee
      ) {
        return;
      }

      const questions =
        getCurrentExamQuestions();

      if (
        questions.length ===
        0
      ) {
        alert(
          "這門課目前沒有題目。"
        );

        return;
      }

      const unanswered =
        questions.filter(
          (question) =>
            examAnswers[
              question.id
            ] ===
            undefined
        );

      if (
        unanswered.length >
        0
      ) {
        alert(
          `還有 ${unanswered.length} 題尚未作答。`
        );

        return;
      }

      let correct =
        0;

      questions.forEach(
        (question) => {
          if (
            examAnswers[
              question.id
            ] ===
            question.correctAnswer
          ) {
            correct +=
              1;
          }
        }
      );

      const score =
        Math.round(
          (correct /
            questions.length) *
            100
        );

      const passed =
        score >=
        80;

      const {
        date,
        time,
      } =
        getDateTime();

      const attempt: ExamAttempt =
        {
          id:
            Date.now(),

          traineeId:
            selectedTrainee.id,

          courseId:
            selectedCourse.id,

          score,

          passed,

          date,

          time,
        };

      try {
        await saveExamAttempt(
          attempt
        );

        setExamResult({
          score,
          passed,
        });

        if (passed) {
          const finalStage =
            selectedCourse.stages
              .length -
            1;

          await saveCourseProgress(
            selectedTrainee.id,
            selectedCourse.id,
            finalStage,
            currentCheckedItems,
            courseNotes[
              courseKey
            ] || ""
          );

          const record: TrainingRecord =
            {
              id:
                Date.now() +
                1,

              traineeId:
                selectedTrainee.id,

              courseId:
                selectedCourse.id,

              courseTitle:
                selectedCourse.title,

              instructor:
                currentInstructorName,

              fromStage:
                "測驗",

              toStage:
                "通過",

              completedItems:
                currentCheckedItems,

              note:
                `測驗成績 ${score} 分，已通過。`,

              date,

              time,
            };

          await saveTrainingRecord(
            record
          );

          setCourseStages(
            (prev) => ({
              ...prev,

              [courseKey]:
                finalStage,
            })
          );
        }
      } catch (
        error
      ) {
        console.error(
          error
        );

        alert(
          "測驗成績儲存失敗，請再試一次。"
        );
      }
    };

  /* =========================================================
     RECORD FILTERS
     ========================================================= */

  const getTraineeRecords =
    (
      traineeId: number
    ) =>
      trainingRecords.filter(
        (record) =>
          record.traineeId ===
          traineeId
      );

  const getCourseRecords =
    (
      traineeId: number,
      courseId: string
    ) =>
      trainingRecords.filter(
        (record) =>
          record.traineeId ===
            traineeId &&
          record.courseId ===
            courseId
      );

  const getCourseExamAttempts =
    (
      traineeId: number,
      courseId: string
    ) =>
      examAttempts.filter(
        (attempt) =>
          attempt.traineeId ===
            traineeId &&
          attempt.courseId ===
            courseId
      );

  /* =========================================================
     AUTH LOADING
     ========================================================= */

  if (
    authLoading ||
    profileLoading
  ) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <span className="role-badge">
            STAFF TRAINING
          </span>

          <h1>
            正在確認帳號權限…
          </h1>

          <p className="welcome-subtitle">
            請稍候
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     LOGIN
     ========================================================= */

  if (!user) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <span className="role-badge">
            STAFF TRAINING
          </span>

          <h1>
            新進夥伴
            <br />
            訓練系統
          </h1>

          <p className="welcome-subtitle">
            請使用授權的 Google 帳號登入
          </p>

          <div className="message-box warm">
            <strong>
              Google 帳號登入
            </strong>

            <p>
              系統會依照帳號判斷你的身分、
              可使用分店與操作權限。
            </p>
          </div>

          <button
            className="primary-btn full"
            onClick={
              handleGoogleLogin
            }
            disabled={
              signingIn
            }
          >
            {signingIn
              ? "正在登入…"
              : "使用 Google 帳號登入 →"}
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     NOT AUTHORIZED
     ========================================================= */

  if (
    profileError ===
    "not-found"
  ) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <span className="role-badge">
            尚未授權
          </span>

          <h1>
            此帳號目前
            <br />
            無法進入系統
          </h1>

          <div className="message-box warm">
            <strong>
              登入帳號
            </strong>

            <p>
              {user.email}
            </p>
          </div>

          <button
            className="secondary-btn"
            style={{
              width:
                "100%",
            }}
            onClick={
              handleLogout
            }
          >
            登出並更換帳號
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     INACTIVE
     ========================================================= */

  if (
    profileError ===
    "inactive"
  ) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <span className="role-badge">
            ACCOUNT INACTIVE
          </span>

          <h1>
            此帳號已停用
          </h1>

          <p>
            請聯絡系統管理者。
          </p>

          <button
            className="secondary-btn"
            style={{
              width:
                "100%",
            }}
            onClick={
              handleLogout
            }
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     PROFILE ERROR
     ========================================================= */

  if (
    profileError ===
      "error" ||
    !profile
  ) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <h1>
            無法讀取帳號權限
          </h1>

          <button
            className="secondary-btn"
            style={{
              width:
                "100%",
            }}
            onClick={
              handleLogout
            }
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     TRAINEE PLACEHOLDER
     ========================================================= */

  if (
    profile.role ===
    "trainee"
  ) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <span className="role-badge">
            TRAINEE
          </span>

          <h1>
            歡迎，
            <br />
            {profile.name} 👋
          </h1>

          <div className="message-box warm">
            <strong>
              新夥伴學習模式
            </strong>

            <p>
              這裡之後會顯示自己的課程、進度與測驗。
            </p>
          </div>

          <button
            className="secondary-btn"
            style={{
              width:
                "100%",
            }}
            onClick={
              handleLogout
            }
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     ADMIN PAGE
     ========================================================= */

  if (
    page ===
      "admin" &&
    profile.role ===
      "admin"
  ) {
    const admins =
      adminUsers.filter(
        (item) =>
          item.role ===
          "admin"
      );

    const instructors =
      adminUsers.filter(
        (item) =>
          item.role ===
          "instructor"
      );

    return (
      <div className="container">
        <button
          className="back-btn"
          onClick={() =>
            setPage(
              "welcome"
            )
          }
        >
          ← 返回
        </button>

        <div className="page-title">
          <p>
            ADMIN MANAGEMENT
          </p>

          <h1>
            帳號與 Instructor 管理
          </h1>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>
              Admin
            </span>

            <strong>
              {admins.length}
            </strong>

            <small>
              系統管理員
            </small>
          </div>

          <div className="stat-card">
            <span>
              Instructor
            </span>

            <strong>
              {instructors.length}
            </strong>

            <small>
              已建立教官
            </small>
          </div>

          <div className="stat-card">
            <span>
              啟用中
            </span>

            <strong>
              {
                adminUsers.filter(
                  (item) =>
                    item.active
                ).length
              }
            </strong>

            <small>
              可登入帳號
            </small>
          </div>

          <div className="stat-card">
            <span>
              已停用
            </span>

            <strong>
              {
                adminUsers.filter(
                  (item) =>
                    !item.active
                ).length
              }
            </strong>

            <small>
              無法登入
            </small>
          </div>
        </div>

        <div
          className="white-panel"
          style={{
            marginBottom:
              "32px",
          }}
        >
          <span className="eyebrow">
            NEW INSTRUCTOR
          </span>

          <h2>
            新增 Instructor
          </h2>

          <p>
            先建立授權帳號。對方之後使用相同的
            Google Email 登入，就會取得 Instructor
            權限。
          </p>

          <div className="form-grid">
            <div className="field">
              <label>
                Instructor 姓名 *
              </label>

              <input
                value={
                  newInstructor.name
                }
                onChange={(
                  e
                ) =>
                  setNewInstructor(
                    (prev) => ({
                      ...prev,

                      name:
                        e.target.value,
                    })
                  )
                }
                placeholder="例如：紜如"
              />
            </div>

            <div className="field">
              <label>
                Google Email *
              </label>

              <input
                value={
                  newInstructor.email
                }
                onChange={(
                  e
                ) =>
                  setNewInstructor(
                    (prev) => ({
                      ...prev,

                      email:
                        e.target.value,
                    })
                  )
                }
                placeholder="example@gmail.com"
              />
            </div>
          </div>

          <div
            className="field"
            style={{
              marginTop:
                "18px",
            }}
          >
            <label>
              可進入分店 *
            </label>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
                marginTop:
                  "8px",
              }}
            >
              {stores.map(
                (
                  storeItem
                ) => {
                  const checked =
                    newInstructor.stores.includes(
                      storeItem.id
                    );

                  return (
                    <button
                      key={
                        storeItem.id
                      }
                      type="button"
                      className={`check-item ${
                        checked
                          ? "checked"
                          : ""
                      }`}
                      style={{
                        width:
                          "auto",
                      }}
                      onClick={() =>
                        toggleNewInstructorStore(
                          storeItem.id
                        )
                      }
                    >
                      <span className="checkbox">
                        {checked
                          ? "✓"
                          : ""}
                      </span>

                      <span>
                        {storeItem.name}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <button
            className="primary-btn"
            style={{
              marginTop:
                "22px",
            }}
            onClick={
              createInstructor
            }
            disabled={
              adminSaving
            }
          >
            {adminSaving
              ? "正在建立…"
              : "＋ 建立 Instructor"}
          </button>
        </div>

        <div className="section-heading">
          <div>
            <span className="eyebrow">
              USERS
            </span>

            <h2>
              目前授權帳號
            </h2>
          </div>
        </div>

        {adminLoading ? (
          <div className="empty-record">
            正在讀取帳號資料...
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gap:
                "16px",
            }}
          >
            {adminUsers.map(
              (
                person
              ) => (
                <div
                  key={
                    person.id
                  }
                  className="white-panel"
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap:
                        "20px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <span className="eyebrow">
                        {person.role ===
                        "admin"
                          ? "ADMIN"
                          : person.role ===
                              "instructor"
                          ? "INSTRUCTOR"
                          : "TRAINEE"}
                      </span>

                      <h2>
                        {person.name ||
                          "未命名"}
                      </h2>

                      <p>
                        {person.email}
                      </p>
                    </div>

                    <strong>
                      {person.active
                        ? "🟢 Active"
                        : "⚪ Inactive"}
                    </strong>
                  </div>

                  {person.role ===
                    "admin" && (
                    <div
                      className="message-box warm"
                      style={{
                        marginTop:
                          "16px",
                      }}
                    >
                      <strong>
                        Admin
                      </strong>

                      <p>
                        管理員可使用全部分店與管理功能。
                      </p>
                    </div>
                  )}

                  {person.role ===
                    "instructor" && (
                    <>
                      <div
                        style={{
                          marginTop:
                            "18px",
                        }}
                      >
                        <strong>
                          分店權限
                        </strong>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "10px",
                            flexWrap:
                              "wrap",
                            marginTop:
                              "10px",
                          }}
                        >
                          {stores.map(
                            (
                              storeItem
                            ) => {
                              const checked =
                                person.stores.includes(
                                  storeItem.id
                                );

                              return (
                                <button
                                  key={
                                    storeItem.id
                                  }
                                  className={`check-item ${
                                    checked
                                      ? "checked"
                                      : ""
                                  }`}
                                  style={{
                                    width:
                                      "auto",
                                  }}
                                  onClick={() =>
                                    toggleExistingUserStore(
                                      person,
                                      storeItem.id
                                    )
                                  }
                                >
                                  <span className="checkbox">
                                    {checked
                                      ? "✓"
                                      : ""}
                                  </span>

                                  <span>
                                    {storeItem.name}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      <button
                        className={
                          person.active
                            ? "secondary-btn"
                            : "primary-btn"
                        }
                        style={{
                          marginTop:
                            "18px",
                          width:
                            "auto",
                        }}
                        onClick={() =>
                          toggleAdminUserActive(
                            person
                          )
                        }
                      >
                        {person.active
                          ? "停用此帳號"
                          : "重新啟用"}
                      </button>
                    </>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  /* =========================================================
     WELCOME
     ========================================================= */

  if (
    page ===
    "welcome"
  ) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <span className="role-badge">
            {profile.role ===
            "admin"
              ? "ADMIN"
              : "INSTRUCTOR"}
          </span>

          <h1>
            歡迎回來，
            <br />
            {profile.name} 👋
          </h1>

          <p className="welcome-subtitle">
            {profile.role ===
            "admin"
              ? "管理員模式"
              : "Instructor 教學模式"}
          </p>

          <div className="message-box warm">
            <strong>
              溫馨提醒
            </strong>

            <p>
              請友善並有耐心地對待每一位新夥伴。
              新人需要的是清楚的示範、練習與回饋，
              而不是一次就會。
            </p>
          </div>

          <div className="message-box">
            <strong>
              帳號資訊
            </strong>

            <p>
              {profile.email}
            </p>

            <p>
              身分：
              {profile.role ===
              "admin"
                ? " Admin"
                : " Instructor"}
            </p>
          </div>

          {profile.role ===
            "admin" && (
            <button
              className="secondary-btn"
              style={{
                width:
                  "100%",
                marginBottom:
                  "12px",
              }}
              onClick={() =>
                setPage(
                  "admin"
                )
              }
            >
              ⚙️ Admin 後台
            </button>
          )}

          <button
            className="primary-btn full"
            onClick={() =>
              setPage(
                "stores"
              )
            }
          >
            開始今天的教學 →
          </button>

          <button
            className="secondary-btn"
            style={{
              width:
                "100%",
              marginTop:
                "12px",
            }}
            onClick={
              handleLogout
            }
          >
            登出
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     STORES
     ========================================================= */

  if (
    page ===
    "stores"
  ) {
    return (
      <div className="container">
        <button
          className="back-btn"
          onClick={() =>
            setPage(
              "welcome"
            )
          }
        >
          ← 返回
        </button>

        <div className="page-title">
          <p>
            {profile.name}
            {profile.role ===
            "admin"
              ? "・Admin"
              : "・Instructor"}
          </p>

          <h1>
            請選擇今天的教學分店
          </h1>
        </div>

        {loadingData && (
          <div className="helper-note">
            正在從 Firebase 讀取資料...
          </div>
        )}

        <div className="store-grid">
          {allowedStores.map(
            (
              item
            ) => {
              const count =
                trainees.filter(
                  (person) =>
                    person.storeId ===
                      item.id &&
                    person.status !==
                      "certified"
                ).length;

              return (
                <div
                  key={
                    item.id
                  }
                  className="store-card"
                >
                  <div>
                    <span className="store-label">
                      {profile.role ===
                      "admin"
                        ? "Admin 可使用"
                        : "已授權"}
                    </span>

                    <h2>
                      {item.name}
                    </h2>

                    <p className="store-address">
                      {item.address}
                    </p>
                  </div>

                  <div className="store-bottom">
                    <div className="training-count">
                      <span>
                        目前訓練中
                      </span>

                      <strong>
                        {count} 人
                      </strong>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() =>
                        chooseStore(
                          item
                        )
                      }
                    >
                      進入分店 →
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  }

  /* =========================================================
     NEW TRAINEE
     ========================================================= */

  if (
    page ===
    "new-trainee"
  ) {
    return (
      <div className="container narrow">
        <button
          className="back-btn"
          onClick={() =>
            setPage(
              "dashboard"
            )
          }
        >
          ← 返回
        </button>

        <div className="page-title">
          <p>
            {store?.name}
          </p>

          <h1>
            建立新夥伴學習卡
          </h1>
        </div>

        <div className="form-card">
          <div className="form-grid">
            <div className="field">
              <label>
                姓名 *
              </label>

              <input
                value={
                  newTrainee.name
                }
                onChange={(
                  e
                ) =>
                  setNewTrainee(
                    {
                      ...newTrainee,

                      name:
                        e.target.value,
                    }
                  )
                }
                placeholder="請輸入新夥伴姓名"
              />
            </div>

            <div className="field">
              <label>
                員工編號 *
              </label>

              <input
                value={
                  newTrainee.employeeId
                }
                onChange={(
                  e
                ) =>
                  setNewTrainee(
                    {
                      ...newTrainee,

                      employeeId:
                        e.target.value,
                    }
                  )
                }
                placeholder="例如 NTU003"
              />
            </div>

            <div className="field">
              <label>
                到職日期 *
              </label>

              <input
                type="date"
                value={
                  newTrainee.startDate
                }
                onChange={(
                  e
                ) =>
                  setNewTrainee(
                    {
                      ...newTrainee,

                      startDate:
                        e.target.value,
                    }
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                職位 *
              </label>

              <select
                value={
                  newTrainee.position
                }
                onChange={(
                  e
                ) =>
                  setNewTrainee(
                    {
                      ...newTrainee,

                      position:
                        e.target.value,
                    }
                  )
                }
              >
                <option value="計時">
                  計時
                </option>

                <option value="正職">
                  正職
                </option>
              </select>
            </div>

            <div className="field">
              <label>
                所屬分店
              </label>

              <div className="readonly">
                {store?.name}
              </div>
            </div>

            <div className="field">
              <label>
                主要 Instructor
              </label>

              <div className="readonly">
                {currentInstructorName}
              </div>
            </div>

            <div className="field">
              <label>
                第二 Instructor
              </label>

              <input
                value={
                  newTrainee.secondInstructor
                }
                onChange={(
                  e
                ) =>
                  setNewTrainee(
                    {
                      ...newTrainee,

                      secondInstructor:
                        e.target.value,
                    }
                  )
                }
                placeholder="選填"
              />
            </div>

            <div className="field">
              <label>
                預計完成訓練日
              </label>

              <input
                type="date"
                value={
                  newTrainee.plannedFinishDate
                }
                onChange={(
                  e
                ) =>
                  setNewTrainee(
                    {
                      ...newTrainee,

                      plannedFinishDate:
                        e.target.value,
                    }
                  )
                }
              />
            </div>
          </div>

          <div className="field">
            <label>
              備註
            </label>

            <textarea
              value={
                newTrainee.note
              }
              onChange={(
                e
              ) =>
                setNewTrainee(
                  {
                    ...newTrainee,

                    note:
                      e.target.value,
                  }
                )
              }
              placeholder="例如：已有相關經驗、需要加強 POS、排班限制等"
            />
          </div>

          <button
            className="primary-btn full form-submit"
            onClick={
              addTrainee
            }
          >
            建立學習卡
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     EXAM PAGE
     ========================================================= */

  if (
    page ===
      "exam" &&
    selectedTrainee &&
    selectedCourse
  ) {
    const questions =
      getCurrentExamQuestions();

    const attempts =
      getCourseExamAttempts(
        selectedTrainee.id,
        selectedCourse.id
      );

    return (
      <>
        <header>
          <div>
            <strong>
              {selectedTrainee.name}
            </strong>

            <span>
              {selectedCourse.title} 測驗
            </span>
          </div>
        </header>

        <main className="container narrow">
          <button
            className="back-btn"
            onClick={() =>
              setPage(
                "course"
              )
            }
          >
            ← 返回課程
          </button>

          <div className="page-title">
            <p>
              KNOWLEDGE TEST
            </p>

            <h1>
              {selectedCourse.title} 測驗
            </h1>
          </div>

          <div className="learning-warning">
            <strong>
              測驗規則
            </strong>

            <p>
              共 {questions.length} 題，滿分 100 分。
              80 分以上才算通過。
              未通過可以重新測驗，
              每一次成績都會保留。
            </p>
          </div>

          {!examResult && (
            <>
              {questions.map(
                (
                  question,
                  questionIndex
                ) => (
                  <div
                    key={
                      question.id
                    }
                    className="white-panel"
                    style={{
                      marginBottom:
                        "16px",
                    }}
                  >
                    <span className="eyebrow">
                      QUESTION{" "}
                      {questionIndex +
                        1}
                    </span>

                    <h3>
                      {question.question}
                    </h3>

                    <div
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap:
                          "8px",
                      }}
                    >
                      {question.options.map(
                        (
                          option,
                          optionIndex
                        ) => {
                          const selected =
                            examAnswers[
                              question.id
                            ] ===
                            optionIndex;

                          return (
                            <button
                              key={
                                option
                              }
                              className={`check-item ${
                                selected
                                  ? "checked"
                                  : ""
                              }`}
                              onClick={() =>
                                setExamAnswers(
                                  {
                                    ...examAnswers,

                                    [question.id]:
                                      optionIndex,
                                  }
                                )
                              }
                            >
                              <span className="checkbox">
                                {selected
                                  ? "✓"
                                  : ""}
                              </span>

                              <span>
                                {option}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}

              <button
                className="primary-btn full"
                onClick={
                  submitExam
                }
              >
                交卷並計算成績
              </button>
            </>
          )}

          {examResult && (
            <div
              className="white-panel"
              style={{
                textAlign:
                  "center",
              }}
            >
              <span className="eyebrow">
                RESULT
              </span>

              <h1
                style={{
                  fontSize:
                    "54px",
                }}
              >
                {examResult.score} 分
              </h1>

              {examResult.passed ? (
                <>
                  <div className="passed-box">
                    ✓ 測驗通過
                  </div>

                  <p>
                    本課程已更新為「通過」並儲存到 Firebase。
                  </p>

                  <button
                    className="primary-btn full"
                    onClick={() =>
                      setPage(
                        "learning-card"
                      )
                    }
                  >
                    返回學習卡
                  </button>
                </>
              ) : (
                <>
                  <div className="learning-warning">
                    <strong>
                      本次未通過
                    </strong>

                    <p>
                      需要 80 分以上才能通過。
                      本次成績已保留。
                    </p>
                  </div>

                  <button
                    className="primary-btn full"
                    onClick={() => {
                      setExamAnswers(
                        {}
                      );

                      setExamResult(
                        null
                      );
                    }}
                  >
                    重新測驗
                  </button>
                </>
              )}
            </div>
          )}

          {attempts.length >
            0 && (
            <div className="record-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    EXAM HISTORY
                  </span>

                  <h2>
                    測驗紀錄
                  </h2>
                </div>
              </div>

              <div className="record-list">
                {attempts.map(
                  (
                    attempt,
                    index
                  ) => (
                    <div
                      className="record-card"
                      key={
                        attempt.firestoreId ||
                        attempt.id
                      }
                    >
                      <div className="record-date">
                        <strong>
                          第{" "}
                          {attempts.length -
                            index}{" "}
                          次
                        </strong>

                        <span>
                          {attempt.date}
                        </span>

                        <span>
                          {attempt.time}
                        </span>
                      </div>

                      <div className="record-main">
                        <strong>
                          {attempt.score} 分
                        </strong>

                        <p>
                          {attempt.passed
                            ? "✓ 通過"
                            : "未通過"}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </main>
      </>
    );
  }

  /* =========================================================
     LEARNING CARD
     ========================================================= */

  if (
    page ===
      "learning-card" &&
    selectedTrainee
  ) {
    const progress =
      getTraineeProgress(
        selectedTrainee.id
      );

    const completed =
      getCompletedCourseCount(
        selectedTrainee.id
      );

    const records =
      getTraineeRecords(
        selectedTrainee.id
      );

    return (
      <>
        <header>
          <div>
            <strong>
              {store?.name}
            </strong>

            <span>
              新人學習卡
            </span>
          </div>
        </header>

        <main className="container">
          <button
            className="back-btn"
            onClick={() =>
              setPage(
                "dashboard"
              )
            }
          >
            ← 返回 Dashboard
          </button>

          <div className="profile-card">
            <div>
              <span className="small-label">
                {selectedTrainee.employeeId}
              </span>

              <h1>
                {selectedTrainee.name}
              </h1>

              <p>
                {selectedTrainee.position}
                ・Instructor{" "}
                {selectedTrainee.instructor}
              </p>
            </div>

            <div className="profile-progress">
              <strong>
                {progress}%
              </strong>

              <span>
                整體訓練進度
              </span>
            </div>
          </div>

          <div className="progress big-progress">
            <div
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <div className="info-grid">
            <div>
              <span>
                到職日期
              </span>

              <strong>
                {selectedTrainee.startDate}
              </strong>
            </div>

            <div>
              <span>
                職位
              </span>

              <strong>
                {selectedTrainee.position}
              </strong>
            </div>

            <div>
              <span>
                已完成課程
              </span>

              <strong>
                {completed}/{courses.length}
              </strong>
            </div>

            <div>
              <span>
                目前狀態
              </span>

              <strong>
                {selectedTrainee.status ===
                  "training" &&
                  "🟡 Training"}

                {selectedTrainee.status ===
                  "observation" &&
                  "🟠 Observation"}

                {selectedTrainee.status ===
                  "certified" &&
                  "🟢 Certified"}
              </strong>
            </div>
          </div>

          <div className="section-heading course-heading">
            <div>
              <span className="eyebrow">
                TRAINING
              </span>

              <h2>
                訓練課程
              </h2>
            </div>
          </div>

          <div className="learning-course-list">
            {courses.map(
              (
                course,
                index
              ) => {
                const stage =
                  getCourseStage(
                    selectedTrainee.id,
                    course.id
                  );

                const percentage =
                  getCoursePercentage(
                    selectedTrainee.id,
                    course
                  );

                return (
                  <button
                    className="learning-course-card"
                    key={
                      course.id
                    }
                    onClick={() =>
                      openCourse(
                        course
                      )
                    }
                  >
                    <div className="course-index">
                      {String(
                        index +
                          1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div className="course-content">
                      <div className="course-name-row">
                        <h3>
                          {course.title}
                        </h3>

                        <span className="status-pill">
                          {getCourseTypeLabel(
                            course.type
                          )}
                        </span>

                        {course.onsiteOnly &&
                          store?.id ===
                            "ntu" && (
                            <span className="onsite-badge">
                              現場教學
                            </span>
                          )}
                      </div>

                      <p>
                        {course.description}
                      </p>

                      <span className="completion-text">
                        完成條件：
                        {course.completion}
                        　｜　
                        課程進度：
                        {percentage}%
                      </span>
                    </div>

                    <div
                      className={`stage-badge stage-${stage}`}
                    >
                      {
                        course.stages[
                          stage
                        ]
                      }
                    </div>
                  </button>
                );
              }
            )}
          </div>

          <div className="record-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  HISTORY
                </span>

                <h2>
                  最近訓練紀錄
                </h2>
              </div>
            </div>

            {records.length ===
            0 ? (
              <div className="empty-record">
                尚無訓練紀錄
              </div>
            ) : (
              <div className="record-list">
                {records.map(
                  (
                    record
                  ) => (
                    <div
                      className="record-card"
                      key={
                        record.firestoreId ||
                        record.id
                      }
                    >
                      <div className="record-date">
                        <strong>
                          {record.date}
                        </strong>

                        <span>
                          {record.time}
                        </span>
                      </div>

                      <div className="record-main">
                        <div className="record-title-row">
                          <strong>
                            {record.courseTitle}
                          </strong>

                          <span>
                            Instructor{" "}
                            {record.instructor}
                          </span>
                        </div>

                        <div className="record-stage">
                          {record.fromStage}

                          <span>
                            →
                          </span>

                          <strong>
                            {record.toStage}
                          </strong>
                        </div>

                        <p>
                          {record.note}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </main>
      </>
    );
  }

  /* =========================================================
     COURSE PAGE
     ========================================================= */

  if (
    page ===
      "course" &&
    selectedTrainee &&
    selectedCourse
  ) {
    const courseRecords =
      getCourseRecords(
        selectedTrainee.id,
        selectedCourse.id
      );

    const attempts =
      getCourseExamAttempts(
        selectedTrainee.id,
        selectedCourse.id
      );

    const coursePercent =
      getCoursePercentage(
        selectedTrainee.id,
        selectedCourse
      );

    const isFinished =
      currentStage ===
      selectedCourse.stages
        .length -
        1;

    return (
      <>
        <header>
          <div>
            <strong>
              {selectedTrainee.name}
            </strong>

            <span>
              {selectedCourse.title}
            </span>
          </div>
        </header>

        <main className="container course-page">
          <button
            className="back-btn"
            onClick={() =>
              setPage(
                "learning-card"
              )
            }
          >
            ← 返回學習卡
          </button>

          <div className="course-hero">
            <div>
              <span className="eyebrow">
                TRAINING COURSE
              </span>

              <h1>
                {selectedCourse.title}
              </h1>

              <p>
                {selectedCourse.description}
              </p>

              <p>
                課程類型：
                <strong>
                  {" "}
                  {getCourseTypeLabel(
                    selectedCourse.type
                  )}
                </strong>
              </p>
            </div>

            <div className="current-stage">
              <span>
                目前階段
              </span>

              <strong>
                {
                  selectedCourse.stages[
                    currentStage
                  ]
                }
              </strong>

              <span>
                {coursePercent}%
              </span>
            </div>
          </div>

          {selectedCourse.id ===
            "pos" &&
            store?.id ===
              "ntu" && (
              <div className="pos-warning">
                <strong>
                  🔴 微風台大 POS 必須由 Instructor 現場親自教學
                </strong>

                <p>
                  本課程不可讓新人自行完成，
                  必須實際使用 POS 並由教官完成簽核。
                </p>
              </div>
            )}

          <div
            className="stage-track"
            style={{
              gridTemplateColumns:
                `repeat(${selectedCourse.stages.length}, 1fr)`,
            }}
          >
            {selectedCourse.stages.map(
              (
                stage,
                index
              ) => (
                <div
                  key={
                    stage
                  }
                  className={`stage-step ${
                    index <=
                    currentStage
                      ? "active"
                      : ""
                  }`}
                >
                  <div className="stage-circle">
                    {index <
                    currentStage
                      ? "✓"
                      : index +
                        1}
                  </div>

                  <span>
                    {stage}
                  </span>
                </div>
              )
            )}
          </div>

          <div className="course-layout">
            <section className="course-main">
              <div className="white-panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">
                      CHECKLIST
                    </span>

                    <h2>
                      學習內容
                    </h2>
                  </div>

                  <span className="item-count">
                    {currentCheckedItems.length}/
                    {selectedCourse.items.length}
                    　(
                    {checklistPercentage}
                    %)
                  </span>
                </div>

                <div className="training-checklist">
                  {selectedCourse.items.map(
                    (
                      item
                    ) => {
                      const checked =
                        currentCheckedItems.includes(
                          item
                        );

                      return (
                        <button
                          key={
                            item
                          }
                          className={`check-item ${
                            checked
                              ? "checked"
                              : ""
                          }`}
                          onClick={() =>
                            toggleItem(
                              item
                            )
                          }
                        >
                          <span className="checkbox">
                            {checked
                              ? "✓"
                              : ""}
                          </span>

                          <span>
                            {item}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {selectedCourse.type ===
                "knowledge" &&
                attempts.length >
                  0 && (
                  <div className="white-panel course-history-panel">
                    <div className="panel-title">
                      <div>
                        <span className="eyebrow">
                          TEST
                        </span>

                        <h2>
                          測驗紀錄
                        </h2>
                      </div>
                    </div>

                    <div className="mini-history">
                      {attempts.map(
                        (
                          attempt
                        ) => (
                          <div
                            key={
                              attempt.firestoreId ||
                              attempt.id
                            }
                            className="mini-history-item"
                          >
                            <div>
                              <strong>
                                {attempt.date}{" "}
                                {attempt.time}
                              </strong>

                              <span>
                                {attempt.passed
                                  ? "✓ 通過"
                                  : "未通過"}
                              </span>
                            </div>

                            <p>
                              {attempt.score} 分
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              <div className="white-panel course-history-panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">
                      HISTORY
                    </span>

                    <h2>
                      此課程訓練紀錄
                    </h2>
                  </div>
                </div>

                {courseRecords.length ===
                0 ? (
                  <div className="empty-record">
                    這門課還沒有歷史紀錄
                  </div>
                ) : (
                  <div className="mini-history">
                    {courseRecords.map(
                      (
                        record
                      ) => (
                        <div
                          key={
                            record.firestoreId ||
                            record.id
                          }
                          className="mini-history-item"
                        >
                          <div>
                            <strong>
                              {record.date}{" "}
                              {record.time}
                            </strong>

                            <span>
                              Instructor{" "}
                              {record.instructor}
                            </span>
                          </div>

                          <p>
                            {record.fromStage} →{" "}
                            {record.toStage}
                          </p>

                          <small>
                            {record.note}
                          </small>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>

            <aside className="course-sidebar">
              <div className="white-panel">
                <span className="eyebrow">
                  INSTRUCTOR
                </span>

                <h2>
                  本次訓練
                </h2>

                <div className="training-meta">
                  <span>
                    Instructor
                  </span>

                  <strong>
                    {currentInstructorName}
                  </strong>
                </div>

                <div className="training-meta">
                  <span>
                    新人
                  </span>

                  <strong>
                    {selectedTrainee.name}
                  </strong>
                </div>

                <div className="training-meta">
                  <span>
                    課程類型
                  </span>

                  <strong>
                    {getCourseTypeLabel(
                      selectedCourse.type
                    )}
                  </strong>
                </div>

                <div className="training-meta">
                  <span>
                    目前階段
                  </span>

                  <strong>
                    {
                      selectedCourse.stages[
                        currentStage
                      ]
                    }
                  </strong>
                </div>

                <div className="training-meta">
                  <span>
                    Checklist
                  </span>

                  <strong>
                    {checklistPercentage}%
                  </strong>
                </div>

                <label className="note-label">
                  Instructor 備註
                </label>

                <textarea
                  className="note-area"
                  value={
                    courseNotes[
                      courseKey
                    ] || ""
                  }
                  onChange={(
                    e
                  ) =>
                    setCourseNotes(
                      {
                        ...courseNotes,

                        [courseKey]:
                          e.target.value,
                      }
                    )
                  }
                  onBlur={
                    saveCurrentNote
                  }
                  placeholder="記錄本次學習狀況、需加強項目等。"
                />

                {selectedCourse.type ===
                  "knowledge" && (
                  <>
                    {currentStage ===
                      0 && (
                      <button
                        className="primary-btn full"
                        onClick={
                          completeKnowledgeLearning
                        }
                      >
                        完成學習內容 →
                      </button>
                    )}

                    {currentStage ===
                      1 && (
                      <button
                        className="primary-btn full"
                        onClick={
                          startExam
                        }
                      >
                        開始測驗 →
                      </button>
                    )}

                    {currentStage ===
                      2 && (
                      <button
                        className="primary-btn full"
                        onClick={
                          startExam
                        }
                      >
                        {attempts.length >
                        0
                          ? "重新測驗 →"
                          : "開始測驗 →"}
                      </button>
                    )}

                    {currentStage ===
                      3 && (
                      <div className="passed-box">
                        ✓ 測驗已通過
                      </div>
                    )}
                  </>
                )}

                {selectedCourse.type !==
                  "knowledge" &&
                  !isFinished && (
                    <button
                      className="primary-btn full"
                      onClick={
                        advanceCourseStage
                      }
                    >
                      完成本階段並儲存紀錄 →
                    </button>
                  )}

                {selectedCourse.type !==
                  "knowledge" &&
                  isFinished && (
                    <div className="passed-box">
                      ✓ 本課程已完成
                    </div>
                  )}
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  return (
    <>
      <header>
        <div>
          <strong>
            {store?.name}
          </strong>

          <span>
            {store?.address}
          </span>
        </div>

        <div
          style={{
            display:
              "flex",
            gap:
              "10px",
            alignItems:
              "center",
          }}
        >
          <span>
            {profile.name}
            ・
            {profile.role ===
            "admin"
              ? "Admin"
              : "Instructor"}
          </span>

          {profile.role ===
            "admin" && (
            <button
              onClick={() =>
                setPage(
                  "admin"
                )
              }
            >
              Admin 後台
            </button>
          )}

          <button
            onClick={() =>
              setPage(
                "stores"
              )
            }
          >
            切換分店
          </button>

          <button
            onClick={
              handleLogout
            }
          >
            登出
          </button>
        </div>
      </header>

      <main className="container">
        <div className="dashboard-top">
          <div>
            <p>
              {currentInstructorName}
              {profile.role ===
              "admin"
                ? "・Admin"
                : "・Instructor"}
            </p>

            <h1>
              今日訓練 Dashboard
            </h1>
          </div>

          <button
            className="primary-btn"
            onClick={() =>
              setPage(
                "new-trainee"
              )
            }
          >
            ＋ 建立新夥伴
          </button>
        </div>

        {loadingData && (
          <div className="helper-note">
            正在從 Firebase 讀取訓練資料...
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <span>
              訓練中新人
            </span>

            <strong>
              {trainingCount}
            </strong>

            <small>
              目前尚未完成訓練
            </small>
          </div>

          <div className="stat-card">
            <span>
              今日需教學
            </span>

            <strong>
              {currentStoreTrainees.length}
            </strong>

            <small>
              建議查看每位新人進度
            </small>
          </div>

          <div className="stat-card">
            <span>
              尚未開始課程
            </span>

            <strong>
              {totalNotStarted}
            </strong>

            <small>
              尚未進入第一階段
            </small>
          </div>

          <div className="stat-card">
            <span>
              等待 Instructor 檢核
            </span>

            <strong>
              {totalWaitingReview}
            </strong>

            <small>
              等待最後確認
            </small>
          </div>
        </div>

        <section>
          <h2>
            目前訓練中的夥伴
          </h2>

          {currentStoreTrainees.length ===
            0 && (
            <div className="empty-record">
              此分店目前沒有訓練中的新夥伴。
            </div>
          )}

          <div className="trainee-grid">
            {currentStoreTrainees.map(
              (
                person
              ) => {
                const progress =
                  getTraineeProgress(
                    person.id
                  );

                const completed =
                  getCompletedCourseCount(
                    person.id
                  );

                return (
                  <div
                    className="trainee-card"
                    key={
                      person.firestoreId ||
                      person.id
                    }
                  >
                    <div className="trainee-top">
                      <div>
                        <span className="small-label">
                          {person.employeeId}
                        </span>

                        <h3>
                          {person.name}
                        </h3>

                        <p>
                          {person.position}
                          ・Instructor{" "}
                          {person.instructor}
                        </p>
                      </div>

                      <strong>
                        {progress}%
                      </strong>
                    </div>

                    <div className="progress">
                      <div
                        style={{
                          width:
                            `${progress}%`,
                        }}
                      />
                    </div>

                    <div className="status-row">
                      <span>
                        已完成課程
                      </span>

                      <strong>
                        {completed}/{courses.length}
                      </strong>
                    </div>

                    <button
                      className="secondary-btn"
                      onClick={() =>
                        openLearningCard(
                          person
                        )
                      }
                    >
                      查看學習卡
                    </button>
                  </div>
                );
              }
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default App;