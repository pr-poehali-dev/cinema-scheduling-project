import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Movie {
  id: number;
  title: string;
  times: string[];
  price: number;
}

interface MenuItem {
  name: string;
  price: number;
  icon: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

const movies: Movie[] = [
  { id: 1, title: 'Три богатыря и пуп земли', times: ['10:30', '17:20'], price: 350 },
  { id: 2, title: 'Чебурашка', times: ['11:50', '19:00'], price: 400 },
  { id: 3, title: 'Волшебник изумрудного города', times: ['13:30', '21:05'], price: 380 },
  { id: 4, title: 'Горыныч', times: ['15:45'], price: 420 },
];

const menu: MenuItem[] = [
  { name: 'Попкорн маленький', price: 150, icon: 'Popcorn' },
  { name: 'Попкорн средний', price: 250, icon: 'Popcorn' },
  { name: 'Попкорн большой', price: 350, icon: 'Popcorn' },
  { name: 'Кока-кола 0.25л', price: 125, icon: 'Coffee' },
  { name: 'Сладкая вата', price: 250, icon: 'IceCream' },
];

const STORAGE_KEY = 'cinema_bookings';

function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookingMovie, setBookingMovie] = useState<Movie | null>(null);
  const [bookingTime, setBookingTime] = useState<string>('');
  const [showBooking, setShowBooking] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookedSeats, setBookedSeats] = useState<Record<string, number[]>>({});
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setBookedSeats(JSON.parse(stored));
    }
  }, []);

  const getTimeUntilSession = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const sessionTime = new Date();
    sessionTime.setHours(hours, minutes, 0);
    
    if (sessionTime < now) {
      sessionTime.setDate(sessionTime.getDate() + 1);
    }
    
    const diff = sessionTime.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursLeft}ч ${minutesLeft}м`;
  };

  const getSessionKey = (movieId: number, time: string) => {
    return `${movieId}_${time}`;
  };

  const handleSeatClick = (seatId: number) => {
    const sessionKey = getSessionKey(bookingMovie?.id || 0, bookingTime);
    const sessionBookedSeats = bookedSeats[sessionKey] || [];
    
    if (sessionBookedSeats.includes(seatId)) return;
    
    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const handleBooking = (movie: Movie, time: string) => {
    setBookingMovie(movie);
    setBookingTime(time);
    setSelectedSeats([]);
    setCart([]);
    setEmail('');
    setShowBooking(true);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) {
        return prev.map(i => 
          i.name === item.name 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemName: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === itemName);
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          i.name === itemName 
            ? { ...i, quantity: i.quantity - 1 }
            : i
        );
      }
      return prev.filter(i => i.name !== itemName);
    });
  };

  const getTotalFood = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const confirmBooking = async () => {
    if (selectedSeats.length === 0) return;
    if (!email || !email.includes('@')) {
      alert('Пожалуйста, укажите корректный email для получения чека');
      return;
    }
    
    setIsSubmitting(true);
    
    const sessionKey = getSessionKey(bookingMovie?.id || 0, bookingTime);
    const newBookedSeats = {
      ...bookedSeats,
      [sessionKey]: [...(bookedSeats[sessionKey] || []), ...selectedSeats]
    };
    
    setBookedSeats(newBookedSeats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookedSeats));
    
    try {
      const response = await fetch('https://functions.poehali.dev/7d333fb3-8297-49dd-9337-5c4511ac1cd3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          movieTitle: bookingMovie?.title,
          movieTime: bookingTime,
          seats: selectedSeats.sort((a, b) => a - b),
          ticketPrice: bookingMovie?.price,
          cart: cart
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Бронирование подтверждено!\n\nЧек отправлен на ${email}\nПроверьте вашу почту.`);
      } else {
        alert(`✅ Бронирование подтверждено!\n\n⚠️ Ошибка отправки чека: ${data.error || 'Неизвестная ошибка'}\nПроверьте настройки SMTP в секретах проекта.`);
      }
    } catch (error) {
      alert(`✅ Бронирование подтверждено!\n\n⚠️ Не удалось отправить чек: ${error}\nПроверьте настройки SMTP.`);
    }
    
    setIsSubmitting(false);
    setShowBooking(false);
    setSelectedSeats([]);
    setCart([]);
    setEmail('');
  };

  const seats = Array.from({ length: 40 }, (_, i) => {
    const seatId = i + 1;
    const sessionKey = getSessionKey(bookingMovie?.id || 0, bookingTime);
    const sessionBookedSeats = bookedSeats[sessionKey] || [];
    
    return {
      id: seatId,
      row: Math.floor(i / 8) + 1,
      seat: (i % 8) + 1,
      booked: sessionBookedSeats.includes(seatId),
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary neon-glow">
              ВЕРШИНА
            </h1>
            <nav className="hidden md:flex gap-6">
              {['home', 'schedule', 'kinobar', 'about', 'contacts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-medium transition-all ${
                    activeTab === tab
                      ? 'text-primary neon-glow'
                      : 'text-foreground/70 hover:text-primary'
                  }`}
                >
                  {tab === 'home' && 'Главная'}
                  {tab === 'schedule' && 'Расписание'}
                  {tab === 'kinobar' && 'Кинобар'}
                  {tab === 'about' && 'О нас'}
                  {tab === 'contacts' && 'Контакты'}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'home' && (
          <div className="space-y-12 animate-fade-in">
            <section className="text-center py-20 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-3xl" />
              <div className="relative z-10">
                <h2 className="text-5xl md:text-7xl font-heading font-bold mb-6 neon-glow text-primary">
                  КИНОТЕАТР ВЕРШИНА
                </h2>
                <p className="text-xl md:text-2xl text-foreground/80 mb-8">
                  Лучшие фильмы каждый день с 10:00 до 23:00
                </p>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 neon-border"
                  onClick={() => setActiveTab('schedule')}
                >
                  <Icon name="Ticket" className="mr-2" size={24} />
                  Купить билет
                </Button>
              </div>
            </section>

            <section>
              <h3 className="text-3xl font-heading font-bold mb-6 text-secondary neon-glow">
                Сегодня в кино
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {movies.map((movie) => (
                  <Card key={movie.id} className="bg-card border-primary/30 hover-scale overflow-hidden">
                    <div className="h-48 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 flex items-center justify-center">
                      <Icon name="Film" size={64} className="text-primary opacity-50" />
                    </div>
                    <CardHeader>
                      <CardTitle className="font-heading text-lg">{movie.title}</CardTitle>
                      <CardDescription className="text-foreground/60">
                        {movie.times.length} {movie.times.length === 1 ? 'сеанс' : 'сеанса'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {movie.times.map((time) => (
                          <Badge
                            key={time}
                            variant="outline"
                            className="w-full justify-between py-2 border-primary/40"
                          >
                            <span className="text-primary font-bold">{time}</span>
                            <span className="text-foreground/70">{movie.price}₽</span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-4xl font-heading font-bold text-primary neon-glow">
              Расписание сеансов
            </h2>
            <div className="grid gap-6">
              {movies.map((movie) => (
                <Card key={movie.id} className="bg-card border-primary/30">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl flex items-center gap-3">
                      <Icon name="Film" className="text-secondary" />
                      {movie.title}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Стоимость билета: <span className="text-primary font-bold">{movie.price}₽</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {movie.times.map((time) => (
                        <Card
                          key={time}
                          className="bg-muted border-accent/30 hover:border-accent hover-scale cursor-pointer"
                          onClick={() => handleBooking(movie, time)}
                        >
                          <CardContent className="p-4">
                            <div className="text-center space-y-2">
                              <div className="text-3xl font-heading font-bold text-accent neon-glow">
                                {time}
                              </div>
                              <div className="text-sm text-foreground/60">
                                До начала: <span className="text-secondary">{getTimeUntilSession(time)}</span>
                              </div>
                              <Button className="w-full bg-primary hover:bg-primary/90">
                                <Icon name="Ticket" className="mr-2" size={16} />
                                Забронировать
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'kinobar' && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-4xl font-heading font-bold text-primary neon-glow">
              🍿 Кинобар-касса
            </h2>
            <p className="text-lg text-foreground/70">
              Закажите попкорн и напитки прямо при бронировании билетов!
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.map((item, index) => (
                <Card key={index} className="bg-card border-secondary/30 hover-scale">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/30 to-accent/30 flex items-center justify-center">
                          <Icon name={item.icon as any} size={32} className="text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-lg">{item.name}</h3>
                          <p className="text-2xl font-bold text-accent">{item.price}₽</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
            <h2 className="text-4xl font-heading font-bold text-primary neon-glow">
              О кинотеатре
            </h2>
            <Card className="bg-card border-primary/30">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <Icon name="Building" size={48} className="text-secondary" />
                  <div>
                    <h3 className="text-2xl font-heading font-bold">Кинотеатр Вершина</h3>
                    <p className="text-foreground/70">Современный кинотеатр в вашем городе</p>
                  </div>
                </div>
                <p className="text-lg leading-relaxed">
                  Добро пожаловать в кинотеатр "Вершина" - место, где оживают самые яркие киноистории!
                  Мы работаем каждый день с 10:00 до 23:00, чтобы подарить вам незабываемые эмоции.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Icon name="Clock" className="text-accent" size={24} />
                    <div>
                      <p className="font-semibold">Время работы</p>
                      <p className="text-foreground/70">10:00 - 23:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="Users" className="text-accent" size={24} />
                    <div>
                      <p className="font-semibold">Вместимость</p>
                      <p className="text-foreground/70">40 мест</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-4xl font-heading font-bold text-primary neon-glow">
              Контакты
            </h2>
            <Card className="bg-card border-primary/30">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <Icon name="MapPin" className="text-secondary mt-1" size={24} />
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-1">Адрес</h3>
                    <p className="text-foreground/70">г. Москва, ул. Примерная, д. 1</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Icon name="Phone" className="text-secondary mt-1" size={24} />
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-1">Телефон</h3>
                    <p className="text-foreground/70">+7 (999) 123-45-67</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Icon name="Mail" className="text-secondary mt-1" size={24} />
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-1">Email</h3>
                    <p className="text-foreground/70">info@vershina-cinema.ru</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Icon name="Clock" className="text-secondary mt-1" size={24} />
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-1">Время работы</h3>
                    <p className="text-foreground/70">Ежедневно с 10:00 до 23:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading">
              {bookingMovie?.title} - {bookingTime}
            </DialogTitle>
            <DialogDescription>
              Выберите места и добавьте что-нибудь из кинобара
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                  <Icon name="Armchair" size={24} className="text-primary" />
                  Выбор мест
                </h3>
                <div className="flex justify-center mb-4">
                  <div className="bg-muted px-8 py-2 rounded-t-3xl">
                    <Icon name="Monitor" size={32} className="text-accent" />
                    <p className="text-xs text-center text-foreground/60 mt-1">ЭКРАН</p>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {seats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat.id)}
                      disabled={seat.booked}
                      className={`aspect-square rounded-lg border-2 transition-all text-xs font-bold ${
                        seat.booked
                          ? 'bg-muted border-muted cursor-not-allowed opacity-50'
                          : selectedSeats.includes(seat.id)
                          ? 'bg-secondary border-secondary text-secondary-foreground neon-border'
                          : 'bg-card border-primary/30 hover:border-primary hover:scale-110'
                      }`}
                    >
                      {seat.seat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-6 text-sm mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-primary/30 bg-card" />
                    <span>Свободно</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-secondary bg-secondary" />
                    <span>Выбрано</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-muted bg-muted opacity-50" />
                    <span>Занято</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                  <Icon name="Popcorn" size={24} className="text-accent" />
                  Кинобар
                </h3>
                <div className="space-y-3">
                  {menu.map((item, index) => (
                    <Card key={index} className="bg-muted border-accent/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/30 to-secondary/30 flex items-center justify-center">
                              <Icon name={item.icon as any} size={24} className="text-accent" />
                            </div>
                            <div>
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-accent font-bold">{item.price}₽</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart(item)}
                            className="bg-accent hover:bg-accent/90"
                          >
                            <Icon name="Plus" size={16} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {cart.length > 0 && (
                <div>
                  <h3 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                    <Icon name="ShoppingCart" size={24} className="text-secondary" />
                    Корзина
                  </h3>
                  <Card className="bg-card border-secondary/30">
                    <CardContent className="p-4 space-y-2">
                      {cart.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-primary/10 last:border-0">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-foreground/60">
                              {item.price}₽ × {item.quantity} = {item.price * item.quantity}₽
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => removeFromCart(item.name)}
                              className="h-8 w-8 p-0"
                            >
                              <Icon name="Minus" size={14} />
                            </Button>
                            <span className="w-6 text-center font-bold">{item.quantity}</span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => addToCart(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Icon name="Plus" size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-primary/20 pt-6 mt-6 space-y-6">
            <div>
              <Label htmlFor="email" className="text-lg font-heading mb-2 flex items-center gap-2">
                <Icon name="Mail" size={20} className="text-accent" />
                Email для получения чека
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 text-lg h-12 border-primary/30"
                required
              />
              <p className="text-sm text-foreground/60 mt-2">
                📧 На этот адрес придёт электронный билет с деталями бронирования
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-foreground/60">
                  Билеты: {selectedSeats.length} шт × {bookingMovie?.price}₽ = {(bookingMovie?.price || 0) * selectedSeats.length}₽
                </p>
                {cart.length > 0 && (
                  <p className="text-sm text-foreground/60">
                    Кинобар: {getTotalFood()}₽
                  </p>
                )}
                <p className="text-3xl font-heading font-bold text-primary">
                  Итого: {(bookingMovie?.price || 0) * selectedSeats.length + getTotalFood()}₽
                </p>
              </div>
              <Button
                size="lg"
                onClick={confirmBooking}
                disabled={selectedSeats.length === 0 || isSubmitting || !email}
                className="bg-secondary hover:bg-secondary/90 neon-border text-lg px-8"
              >
                {isSubmitting ? (
                  <>
                    <Icon name="Loader2" className="mr-2 animate-spin" size={20} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Check" className="mr-2" size={20} />
                    Забронировать
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="bg-card border-t border-primary/20 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-2xl font-heading font-bold text-primary neon-glow mb-2">
              ВЕРШИНА
            </h3>
            <p className="text-foreground/60">
              © 2024 Кинотеатр Вершина. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Index;