export type Tab='today'|'goals'|'habits'|'ai'|'history';
export type Goal={id:string;title:string;category:string;progress:number;deadline:string};
export type Habit={id:string;title:string;icon:string;done:boolean;streak:number};
export type DailyStats={sleep:string;steps:number;energy:number;mood:number;recovery:number;focus:number};
