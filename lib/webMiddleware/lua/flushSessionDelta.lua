local UNICORN = table.remove(KEYS, 1)
local SUBSESSION = table.remove(KEYS, 1)

local flag = 0
local k

for _, v in pairs(KEYS) do
    if v == '#am' then
        flag = 1
    elseif v == '#d' then
        flag = 2
    elseif flag == 1 then
        if not k then
            k = v
        else
            if v == 'true' then v = 1 elseif v == 'false' then v = 0 end
            redis.call('hset', 'sess:' .. UNICORN, k, v)
            k = nil
        end
    elseif flag == 2 then
        redis.call('hdel', 'sess:' .. UNICORN, v)
    end
end

redis.call('del', 'sexp:' .. UNICORN)
redis.call('hdel', 'sess:' .. UNICORN, 'kill')

if SUBSESSION ~= '-1' then
    redis.call('set', 'subs:' .. UNICORN, SUBSESSION)
end