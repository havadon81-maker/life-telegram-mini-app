import type {Goal,Habit} from '../types';
const goalsKey='life_goals_v1', habitsKey='life_habits_v1';
export const defaultGoals:Goal[]=[{id:'1',title:'Пробежать 10 км',category:'Здоровье и тело',progress:52,deadline:'01.12.2026'},{id:'2',title:'Прочитать 12 книг',category:'Учёба',progress:58,deadline:'31.12.2026'},{id:'3',title:'Развить новое хобби',category:'Хобби',progress:32,deadline:'20.01.2027'}];
export const defaultHabits:Habit[]=[{id:'1',title:'Выпить 2 л воды',icon:'💧',done:true,streak:6},{id:'2',title:'Читать 20 минут',icon:'📚',done:false,streak:5},{id:'3',title:'Тренировка',icon:'🏃',done:true,streak:4},{id:'4',title:'Лечь до 00:00',icon:'😴',done:false,streak:5}];
export function loadGoals(){try{return JSON.parse(localStorage.getItem(goalsKey)||'null')||defaultGoals}catch{return defaultGoals}}
export function saveGoals(v:Goal[]){localStorage.setItem(goalsKey,JSON.stringify(v))}
export function loadHabits(){try{return JSON.parse(localStorage.getItem(habitsKey)||'null')||defaultHabits}catch{return defaultHabits}}
export function saveHabits(v:Habit[]){localStorage.setItem(habitsKey,JSON.stringify(v))}
