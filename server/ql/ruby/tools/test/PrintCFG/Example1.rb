# Example1 test case for PrintCFG.ql

# COMPLIANT - Basic control flow for CFG testing
def simple_method(x)
  if x > 0
    puts "Positive"
  else
    puts "Non-positive"
  end

  (0..2).each do |i|
    puts i
  end
end

# NON_COMPLIANT - Method with complex control flow
def complex_method(value)
  return -1 if value < 0

  while value > 10
    value = value / 2
  end

  case value
  when 0
    0
  when 1
    1
  else
    value * 2
  end
end
