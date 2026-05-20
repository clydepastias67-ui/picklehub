export type Booking = { id: string; user_id: string; status: string; total_price: number; created_at: string; start_time: string; end_time: string; courts?: { name: string; type?: string; };};
export type Court = { id:string; name:string; type:string; price_per_hour:number; is_available:boolean; image_url?:string; description?:string; };
export type Coach = { id:string; name:string; skill_level:string; price_per_session:number; is_available:boolean; bio?:string; image_url?:string; };
export type MenuItem = { id:string; name:string; category:string; price:number; is_available:boolean; image_url?:string; description?:string; stock?:number; };
export type Product = { id:string; name:string; category:string; price?:number; rental_price?:number; stock:number; low_stock_threshold?:number; is_for_sale:boolean; is_for_rent:boolean; image_url?:string; description?:string; is_active?:boolean; };
export type Tournament = { id:string; name:string; date:string; max_players:number; entry_fee:number; status:string; format:string; description?:string; };
export type Admin = { id:string; email:string; created_at:string; };
export type Employee = { id:string; email:string; name:string; role:string; created_at:string; };
export type Notif = { id:string; type:'booking'|'food'|'shop'|'coaching'|'tournament'|'stock'; title:string; body:string; time:Date; read:boolean; };

export const EMPTY_COURT   = { name:'', type:'indoor', price_per_hour:0, is_available:true, description:'' };
export const EMPTY_MENU    = { name:'', category:'snacks', price:0, is_available:true, description:'', stock:0 };
export const EMPTY_PRODUCT = { name:'', category:'rackets', price:0, rental_price:0, stock:0, is_for_sale:true, is_for_rent:false, description:'' };
export const EMPTY_COACH   = { name:'', skill_level:'beginner', price_per_session:0, is_available:true, bio:'' };
export const EMPTY_TOURNAMENT = { name:'', date:'', max_players:0, entry_fee:0, status:'open', format:'single_elim', description:'' };