def unrelated
  # No calls
end

def target
  unrelated
end

def intermediate
  target
end

def source
  intermediate
end
