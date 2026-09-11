import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type MoodType = 'muy_mal' | 'mal' | 'normal' | 'bien' | 'excelente';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'diario' | 'semanal';
  color: string;
  icon: string;
  streak: number;
  completedDates: string[]; // YYYY-MM-DD
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'baja' | 'media' | 'alta';
  dueDate?: string;
  createdAt: string;
}

export interface MoodRecord {
  date: string; // YYYY-MM-DD
  mood: MoodType;
}

export interface WellnessData {
  waterGlasses: number;
  waterGoal: number;
  dailyGratitude?: string;
}

export interface AppStats {
  habitsCompletedToday: number;
  totalHabits: number;
  pendingTasks: number;
  completedTasks: number;
  streak: number;
  moodToday: MoodType | null;
}

const STORAGE_KEY = 'kesjapp_state_v1';

@Injectable({
  providedIn: 'root'
})
export class KesjDataService {
  private habitsSubject = new BehaviorSubject<Habit[]>([]);
  private tasksSubject = new BehaviorSubject<TaskItem[]>([]);
  private moodsSubject = new BehaviorSubject<MoodRecord[]>([]);
  private wellnessSubject = new BehaviorSubject<WellnessData>({ waterGlasses: 0, waterGoal: 8 });

  readonly habits$: Observable<Habit[]> = this.habitsSubject.asObservable();
  readonly tasks$: Observable<TaskItem[]> = this.tasksSubject.asObservable();
  readonly moods$: Observable<MoodRecord[]> = this.moodsSubject.asObservable();
  readonly wellness$: Observable<WellnessData> = this.wellnessSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  get todayStr(): string {
    return this.formatDate(new Date());
  }

  formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.habits)) this.habitsSubject.next(parsed.habits);
        if (Array.isArray(parsed.tasks)) this.tasksSubject.next(parsed.tasks);
        if (Array.isArray(parsed.moods)) this.moodsSubject.next(parsed.moods);
        if (parsed.wellness) this.wellnessSubject.next(parsed.wellness);
      }
    } catch (e) {
      console.warn('Error reading stored KesjApp data', e);
    }
  }

  private saveToStorage() {
    try {
      const data = {
        habits: this.habitsSubject.value,
        tasks: this.tasksSubject.value,
        moods: this.moodsSubject.value,
        wellness: this.wellnessSubject.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving KesjApp data', e);
    }
  }

  // Habits
  addHabit(habit: Omit<Habit, 'id' | 'streak' | 'completedDates' | 'createdAt'>): Habit {
    const newHabit: Habit = {
      ...habit,
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      streak: 0,
      completedDates: [],
      createdAt: new Date().toISOString()
    };
    const list = [newHabit, ...this.habitsSubject.value];
    this.habitsSubject.next(list);
    this.saveToStorage();
    return newHabit;
  }

  toggleHabitToday(habitId: string) {
    const today = this.todayStr;
    const list = this.habitsSubject.value.map(h => {
      if (h.id !== habitId) return h;
      const isCompletedToday = h.completedDates.includes(today);
      let newCompletedDates: string[];
      let newStreak = h.streak;

      if (isCompletedToday) {
        newCompletedDates = h.completedDates.filter(d => d !== today);
        newStreak = Math.max(0, newStreak - 1);
      } else {
        newCompletedDates = [...h.completedDates, today];
        newStreak = newStreak + 1;
      }

      return {
        ...h,
        completedDates: newCompletedDates,
        streak: newStreak
      };
    });

    this.habitsSubject.next(list);
    this.saveToStorage();
  }

  deleteHabit(habitId: string) {
    const list = this.habitsSubject.value.filter(h => h.id !== habitId);
    this.habitsSubject.next(list);
    this.saveToStorage();
  }

  isHabitDoneToday(habit: Habit): boolean {
    return habit.completedDates.includes(this.todayStr);
  }

  // Tasks
  addTask(task: Omit<TaskItem, 'id' | 'completed' | 'createdAt'>): TaskItem {
    const newTask: TaskItem = {
      ...task,
      id: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      completed: false,
      createdAt: new Date().toISOString()
    };
    const list = [newTask, ...this.tasksSubject.value];
    this.tasksSubject.next(list);
    this.saveToStorage();
    return newTask;
  }

  toggleTask(taskId: string) {
    const list = this.tasksSubject.value.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, completed: !t.completed };
    });
    this.tasksSubject.next(list);
    this.saveToStorage();
  }

  deleteTask(taskId: string) {
    const list = this.tasksSubject.value.filter(t => t.id !== taskId);
    this.tasksSubject.next(list);
    this.saveToStorage();
  }

  // Mood
  setMoodToday(mood: MoodType) {
    const today = this.todayStr;
    const existing = this.moodsSubject.value.filter(m => m.date !== today);
    const updated = [...existing, { date: today, mood }];
    this.moodsSubject.next(updated);
    this.saveToStorage();
  }

  getTodayMood(): MoodType | null {
    const today = this.todayStr;
    const found = this.moodsSubject.value.find(m => m.date === today);
    return found ? found.mood : null;
  }

  // Wellness
  changeWaterGlasses(delta: number) {
    const current = this.wellnessSubject.value;
    const newGlasses = Math.max(0, current.waterGlasses + delta);
    const updated: WellnessData = { ...current, waterGlasses: newGlasses };
    this.wellnessSubject.next(updated);
    this.saveToStorage();
  }

  saveGratitude(text: string) {
    const current = this.wellnessSubject.value;
    const updated: WellnessData = { ...current, dailyGratitude: text };
    this.wellnessSubject.next(updated);
    this.saveToStorage();
  }

  // Calculated Stats
  getStats(): AppStats {
    const habits = this.habitsSubject.value;
    const tasks = this.tasksSubject.value;
    const today = this.todayStr;

    const habitsCompletedToday = habits.filter(h => h.completedDates.includes(today)).length;
    const totalHabits = habits.length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;

    let streak = 0;
    for (const h of habits) {
      if (h.streak > streak) {
        streak = h.streak;
      }
    }

    return {
      habitsCompletedToday,
      totalHabits,
      pendingTasks,
      completedTasks,
      streak,
      moodToday: this.getTodayMood()
    };
  }

  loadSampleData() {
    const today = this.todayStr;
    const sampleHabits: Habit[] = [
      {
        id: 'h_1',
        name: 'Beber 2L de agua',
        description: 'Mantenerse hidratado durante el día',
        frequency: 'diario',
        color: '#3b82f6',
        icon: 'water-outline',
        streak: 3,
        completedDates: [today],
        createdAt: new Date().toISOString()
      },
      {
        id: 'h_2',
        name: 'Lectura diaria',
        description: 'Leer 20 páginas de un libro',
        frequency: 'diario',
        color: '#8b5cf6',
        icon: 'book-outline',
        streak: 5,
        completedDates: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'h_3',
        name: 'Ejercicio o caminata',
        description: '30 minutos de actividad física',
        frequency: 'diario',
        color: '#10b981',
        icon: 'fitness-outline',
        streak: 2,
        completedDates: [],
        createdAt: new Date().toISOString()
      }
    ];

    const sampleTasks: TaskItem[] = [
      {
        id: 't_1',
        title: 'Revisar pendientes semanales',
        description: 'Organizar la agenda para los próximos días',
        completed: false,
        priority: 'alta',
        createdAt: new Date().toISOString()
      },
      {
        id: 't_2',
        title: 'Comprar frutas y verduras',
        description: 'Mercado de la semana',
        completed: true,
        priority: 'media',
        createdAt: new Date().toISOString()
      },
      {
        id: 't_3',
        title: 'Planificar metas del mes',
        description: 'Revisar objetivos personales y profesionales',
        completed: false,
        priority: 'baja',
        createdAt: new Date().toISOString()
      }
    ];

    this.habitsSubject.next(sampleHabits);
    this.tasksSubject.next(sampleTasks);
    this.setMoodToday('bien');
    this.wellnessSubject.next({ waterGlasses: 4, waterGoal: 8, dailyGratitude: 'Agradecido por un nuevo día de oportunidades.' });
    this.saveToStorage();
  }

  clearAllData() {
    this.habitsSubject.next([]);
    this.tasksSubject.next([]);
    this.moodsSubject.next([]);
    this.wellnessSubject.next({ waterGlasses: 0, waterGoal: 8 });
    this.saveToStorage();
  }
}
