local N = 10000

local the_lock = redis.call('get', 'add_room_lock')

if not the_lock then
    redis.call('set', 'add_room_lock', 1, 'px', N)
    return '1'
else
    return nil
end