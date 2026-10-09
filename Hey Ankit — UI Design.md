# Hey Ankit — UI design

Playable mock: scroll the chat and the inbox, type and send, tap a sent bubble, press the buttons.

## Hey Ankit

Private chat. Just us.

Username

Password

New here? Create account

© Being Frzi

1 · Login / Register

←

A

**Ankit**online

Log out

Today

Hey! what's the update?11:02 AM

Will be up in a minute.11:03 AM ✓✓

Are you sure? I don't see it.11:03 AM

Check this

11:04 AM · edited ✓✓

Is it really today?11:05 AM

Wel no, I think it is not today.11:05 AM ✓✓

Ou, I see! I was hoping…11:06 AM

Yeah, me too, I really wanna see it.11:07 AM ✓

Edit · 20s left

Unsend

📷

2 · Chat — scroll, type, send, tap a sent bubble

## Friends

Log out

Search username

Recent

J

**jane**

Hello are you home?

5m2

L

**leslie**

Yes, i will be available tomorrow…

3:00 PM3

D

**dianne**

Nice performance today!

1:35 PM

H

**hawkins**

Can we talk now?

Yesterday

W

**williamson**

It's my pleasure

Monday

J

**jerome**

Nice to meet you

Wednesday

B

**brooklyn**

By the way, did you see…

3/10/26

Chats

Users

Unsent log

3 · Admin inbox — scroll the list

### Design tokens

page #4CBFB5g1 #0A5F66g2 #2A9D9Ag3 #8ED6CFreceived #C9ECE8sent #27706Fink #0E3B3Fbadge #E5484D

### Motion spec

- Signature moment: the wave header is liquid. Scrolling shifts its gradient sideways, shrinks the title and folds the search away.
- Messages spring in with a small overshoot, staggered once on load, then as they scroll into view. Sent bubbles grow from the bottom right, received from the bottom left.
- Every button presses down (scale .92) and sends a ripple from the touch point. The send icon flies off and returns. Login shows a spinner.
- Tap a sent bubble: menu pops from the bubble with a live 20 s edit countdown. Admin tabs: one indicator slides between tabs with a spring.
- All of it is transform and opacity only, except the header collapse which is a few px. Reduced-motion turns it off.