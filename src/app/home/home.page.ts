import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import {
  KesjDataService,
  Habit,
  TaskItem,
  MoodType,
  AppStats,
  WellnessData
} from '../services/kesj-data.service';

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentTab: 'inicio' | 'habitos' | 'tareas' | 'bienestar' | 'ajustes' = 'inicio';
  currentDateStr: string = '';

  user$ = this.authService.authState$;

  habits: Habit[] = [];
  tasks: TaskItem[] = [];
  wellness: WellnessData = { waterGlasses: 0, waterGoal: 8 };
  stats: AppStats = {
    habitsCompletedToday: 0,
    totalHabits: 0,
    pendingTasks: 0,
    completedTasks: 0,
    streak: 0,
    moodToday: null
  };

  taskFilter: 'pendientes' | 'completadas' | 'todas' = 'pendientes';

  // Mood options
  moodOptions: MoodOption[] = [
    { type: 'muy_mal', emoji: '😞', label: 'Muy mal' },
    { type: 'mal', emoji: '🙁', label: 'Mal' },
    { type: 'normal', emoji: '😐', label: 'Normal' },
    { type: 'bien', emoji: '🙂', label: 'Bien' },
    { type: 'excelente', emoji: '😆', label: 'Excelente' },
  ];

  // New Habit Modal
  isHabitModalOpen: boolean = false;
  habitForm = {
    name: '',
    description: '',
    frequency: 'diario' as 'diario' | 'semanal',
    color: '#2563eb',
    icon: 'checkmark-outline'
  };

  colorPalette: string[] = [
    '#2563eb', // Azul
    '#10b981', // Verde
    '#f59e0b', // Ámbar
    '#ef4444', // Rojo
    '#8b5cf6', // Púrpura
    '#ec4899', // Rosa
    '#14b8a6', // Turquesa
    '#f97316', // Naranja
    '#0ea5e9', // Celeste
    '#84cc16'  // Lima
  ];

  iconOptions: string[] = [
    'checkmark-outline',
    'water-outline',
    'fitness-outline',
    'book-outline',
    'moon-outline',
    'barbell-outline',
    'walk-outline',
    'heart-outline',
    'flame-outline',
    'cafe-outline',
    'bicycle-outline',
    'sparkles-outline'
  ];

  // New Task Modal
  isTaskModalOpen: boolean = false;
  taskForm = {
    title: '',
    description: '',
    priority: 'media' as 'baja' | 'media' | 'alta',
    dueDate: ''
  };

  gratitudeText: string = '';

  private subs: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private dataService: KesjDataService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.setCurrentDateFormatted();

    this.subs.add(
      this.dataService.habits$.subscribe((habits) => {
        this.habits = habits;
        this.updateStats();
      })
    );

    this.subs.add(
      this.dataService.tasks$.subscribe((tasks) => {
        this.tasks = tasks;
        this.updateStats();
      })
    );

    this.subs.add(
      this.dataService.wellness$.subscribe((wellness) => {
        this.wellness = wellness;
        this.gratitudeText = wellness.dailyGratitude || '';
      })
    );

    this.subs.add(
      this.dataService.moods$.subscribe(() => {
        this.updateStats();
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private setCurrentDateFormatted() {
    const now = new Date();
    const formatted = now.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    // Formato: sábado, 22 de agosto
    this.currentDateStr = formatted;
  }

  updateStats() {
    this.stats = this.dataService.getStats();
  }

  switchTab(tab: 'inicio' | 'habitos' | 'tareas' | 'bienestar' | 'ajustes') {
    this.currentTab = tab;
  }

  // Habits Logic
  isHabitCompletedToday(habit: Habit): boolean {
    return this.dataService.isHabitDoneToday(habit);
  }

  toggleHabit(habitId: string) {
    this.dataService.toggleHabitToday(habitId);
  }

  openHabitModal() {
    this.habitForm = {
      name: '',
      description: '',
      frequency: 'diario',
      color: this.colorPalette[0],
      icon: this.iconOptions[0]
    };
    this.isHabitModalOpen = true;
  }

  closeHabitModal() {
    this.isHabitModalOpen = false;
  }

  saveHabit() {
    if (!this.habitForm.name.trim()) {
      this.showToast('Por favor escribe el nombre del hábito', 'warning');
      return;
    }

    this.dataService.addHabit({
      name: this.habitForm.name.trim(),
      description: this.habitForm.description.trim(),
      frequency: this.habitForm.frequency,
      color: this.habitForm.color,
      icon: this.habitForm.icon
    });

    this.closeHabitModal();
    this.showToast('¡Hábito creado con éxito!', 'success');
  }

  deleteHabit(habitId: string) {
    this.dataService.deleteHabit(habitId);
    this.showToast('Hábito eliminado', 'medium');
  }

  // Tasks Logic
  get filteredTasks(): TaskItem[] {
    if (this.taskFilter === 'pendientes') {
      return this.tasks.filter(t => !t.completed);
    } else if (this.taskFilter === 'completadas') {
      return this.tasks.filter(t => t.completed);
    }
    return this.tasks;
  }

  toggleTask(taskId: string) {
    this.dataService.toggleTask(taskId);
  }

  openTaskModal() {
    this.taskForm = {
      title: '',
      description: '',
      priority: 'media',
      dueDate: ''
    };
    this.isTaskModalOpen = true;
  }

  closeTaskModal() {
    this.isTaskModalOpen = false;
  }

  saveTask() {
    if (!this.taskForm.title.trim()) {
      this.showToast('Por favor escribe el título de la tarea', 'warning');
      return;
    }

    this.dataService.addTask({
      title: this.taskForm.title.trim(),
      description: this.taskForm.description.trim(),
      priority: this.taskForm.priority,
      dueDate: this.taskForm.dueDate
    });

    this.closeTaskModal();
    this.showToast('¡Tarea creada con éxito!', 'success');
  }

  deleteTask(taskId: string) {
    this.dataService.deleteTask(taskId);
    this.showToast('Tarea eliminada', 'medium');
  }

  // Mood Logic
  selectMood(mood: MoodType) {
    this.dataService.setMoodToday(mood);
    this.showToast(`Estado de ánimo guardado: ${this.getMoodLabel(mood)}`, 'success');
  }

  getMoodLabel(mood: MoodType | null): string {
    const found = this.moodOptions.find(m => m.type === mood);
    return found ? found.label : '—';
  }

  // Wellness
  changeWater(delta: number) {
    this.dataService.changeWaterGlasses(delta);
  }

  saveGratitude() {
    this.dataService.saveGratitude(this.gratitudeText);
    this.showToast('Agradecimiento guardado', 'success');
  }

  // Samples & reset
  loadDemoData() {
    this.dataService.loadSampleData();
    this.showToast('Datos de demostración cargados', 'success');
  }

  resetAllData() {
    this.dataService.clearAllData();
    this.showToast('Datos restablecidos correctamente', 'medium');
  }

  // Auth
  async logout() {
    await this.authService.logout();
    this.showToast('Sesión cerrada correctamente.', 'medium');
    this.router.navigateByUrl('/login');
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
