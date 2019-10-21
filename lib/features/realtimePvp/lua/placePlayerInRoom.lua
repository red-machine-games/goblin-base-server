local PAIR_ID = KEYS[1]
local PID_A = KEYS[2]
local PID_B = KEYS[3]
local HID_A = KEYS[4]
local HID_B = KEYS[5]
local PLAYER_A_BOOKING_KEY = KEYS[6]
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[7])
local NOW = tonumber(KEYS[8])
local PACKED_BOT_OPPONENT_PAYLOAD = KEYS[9]
local OPPONENT_IS_BOT = KEYS[9] ~= '-1'

local player_a_goto
if not OPPONENT_IS_BOT then
    player_a_goto = redis.call('get', 'pgoto:' .. PID_A)
    if player_a_goto and redis.call('exists', 'pair:' .. player_a_goto) == 0 then
        player_a_goto = nil
    end
end

if player_a_goto then
    local the_pair = redis.call('hmget', 'pair:' .. player_a_goto, 'stat', 'upd', 'pida', 'pidb')
    if the_pair[1] == '0' and tonumber(the_pair[2]) + TIME_TO_CONNECT_PAIR > NOW and the_pair[3] == PID_B and the_pair[4] == PID_A then
        redis.call('del', 'pgoto:' .. PID_A, 'pinx:' .. PLAYER_A_BOOKING_KEY)
        redis.call('hmset', 'pair:' .. player_a_goto, 'upd', NOW, 'stat', '1')
        redis.call('hmset', 'pinx:' .. PLAYER_A_BOOKING_KEY, 'prid', player_a_goto, 'pid', PID_A)
        redis.call('set', 'pidnx:' .. PID_A, PLAYER_A_BOOKING_KEY)

        redis.call('publish', 'gr-pub', PID_A .. '//1');
        redis.call('publish', 'gr-pub', PID_B .. '//1');

        return '2'
    else
        return nil
    end
else
    local pidnx_a, pidnx_b = redis.call('get', 'pidnx:' .. PID_A), redis.call('get', 'pidnx:' .. PID_B)
    if pidnx_a then
        local pinx_a = redis.call('hget', 'pinx:' .. pidnx_a, 'prid')
        if pinx_a then
            redis.call('del', 'pair:' .. pinx_a)
        end
    end
    if pidnx_b then
        local pinx_b = redis.call('hget', 'pinx:' .. pidnx_b, 'prid')
        if pinx_b then
            redis.call('del', 'pair:' .. pinx_b)
        end
    end

    local the_pair_stat = redis.call('hget', 'pair:' .. PAIR_ID, 'stat')
    local cat = math.floor(NOW / 1000)
    if the_pair_stat then
        return nil
    elseif OPPONENT_IS_BOT then
        redis.call('del', 'pair:' .. PAIR_ID, 'pinx:' .. PLAYER_A_BOOKING_KEY, 'ping:' .. PID_A)
        redis.call(
            'hmset',
            'pair:' .. PAIR_ID, 'pida', PID_A, 'pidb', PID_B, 'hida', HID_A, 'hidb', HID_B,
            'stat', '1', 'upd', NOW, 'opbot', '1', 'pldb', PACKED_BOT_OPPONENT_PAYLOAD,
            'cat', cat, 'lmsga', cat, 'lmsgb', cat
        )
        redis.call('hmset', 'pinx:' .. PLAYER_A_BOOKING_KEY, 'prid', PAIR_ID, 'pid', PID_A)
        redis.call('set', 'pidnx:' .. PID_A, PLAYER_A_BOOKING_KEY)
        redis.call('incrby', 'the_occupation', -1)
        redis.call('publish', 'gr-pub', PID_A .. '//1');
        return '2'
    else
        redis.call('del', 'pair:' .. PAIR_ID, 'pinx:' .. PLAYER_A_BOOKING_KEY, 'ping:' .. PID_A, 'ping:' .. PID_B)
        redis.call(
            'hmset', 'pair:' .. PAIR_ID,
            'pida', PID_A, 'pidb', PID_B, 'hida', HID_A, 'hidb', HID_B,
            'stat', '0', 'upd', NOW, 'cat', cat, 'lmsga', cat, 'lmsgb', cat
        )
        redis.call('set', 'pgoto:' .. PID_B, PAIR_ID)
        redis.call('hmset', 'pinx:' .. PLAYER_A_BOOKING_KEY, 'prid', PAIR_ID, 'pid', PID_A)
        redis.call('set', 'pidnx:' .. PID_A, PLAYER_A_BOOKING_KEY)
        redis.call('incrby', 'the_occupation', -1)
        return '1'
    end
end