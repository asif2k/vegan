#include <math.h>
#include <stdint.h>
#include <print.h>

typedef float number;
typedef unsigned int uint;



extern "C" number wrandom(number);

#define WASM_EXPORT extern "C"  __attribute__((__visibility__("default")))
#define EXTERN extern "C"

extern "C" {
	// This symbol is provided by the WASM linker (wasm-ld)
	extern unsigned char __heap_base;
	WASM_EXPORT int get_static_memory_size() {return (int)&__heap_base;}
}

void print_vec3(char* text, number* v) {
	print("%s (%f %f %f)", text, v[0], v[1], v[2]);
}
void print_vec4(char* text, number* v) {
	print("%s (%f %f %f %f)", text, v[0], v[1], v[2], v[3]);
}

void print_vec6(char* text, number* v) {
	print("%s (%f %f %f %f %f %f)", text, v[0], v[1], v[2], v[3], v[4], v[5]);
}

void print_mat3(char* text, number* v) {
	print("%s (%f %f %f %f %f %f %f %f %f)", text, v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]);
}



inline uint32_t hash_str(const char* str) {
	uint32_t hash = 2166136261u;
	while (*str) {
		hash ^= (uint8_t)(*str++);
		hash *= 16777619u;
	}
	return hash;
}

// Fast integer hash specifically for memory addresses
inline uint32_t hash_pointer(uint32_t ptr) {
    ptr ^= ptr >> 16;
    ptr *= 0x85ebca6b;
    ptr ^= ptr >> 13;
    ptr *= 0xc2b2ae35;
    ptr ^= ptr >> 16;
    return ptr == 0 ? 1 : ptr; 
}

static number* global_memory;
static uint32_t total_memory, memory_pointer;

static number* global_memory_init(uint32_t size) {
	total_memory = size;
	memory_pointer = 0;
	global_memory = (number*)malloc(sizeof(number) * size);
	return global_memory;


}


static number* math_alloc(uint32_t size) {
	number* a = (number*)global_memory;
	global_memory += (size / 4);
	//print("%u alloc %u %u",total_memory,memory_pointer,size);
	memory_pointer += (size / 4);
	return a;
}

WASM_EXPORT uint32_t global_memory_pointer() {
	return memory_pointer;
}

#include("math.cpp")

WASM_EXPORT void init(uint memory_size) {
	global_memory_init(memory_size);
}

WASM_EXPORT number* alloc(uint memory_size) {
	return math_alloc(memory_size);
}



WASM_EXPORT number* m4_alloc() {
	number *m4=math_alloc(16*4);
	m4_ident(m4);
	return m4;
}


// --- NATIVE SCRATCHPAD ALLOCATOR ---
static uint32_t* scratch_memory;
static uint32_t scratch_ptr = 0;
static uint32_t scratch_capacity = 0;

// Call this ONCE in your app_init() (e.g., 2000000 words = ~8MB of scratch space)
WASM_EXPORT void init_scratchpad(uint32_t max_words) {
    print("init_scratchpad %d",max_words);
    scratch_memory = (uint32_t*)math_alloc(max_words*4);
    scratch_capacity = max_words;
    scratch_ptr = 0;
}

// Allocates 32-bit words from the scratchpad
WASM_EXPORT void* scratch_alloc(uint32_t word_count) {   
    if (scratch_ptr + word_count > scratch_capacity){
        print("scratch_alloc failed %d %d", scratch_ptr + word_count, scratch_capacity);
        return nullptr; // Overflow!    
    }    
    
    void* ptr = &scratch_memory[scratch_ptr];
    //print("scratch_alloc %d %d %d", scratch_ptr,word_count, scratch_capacity);
    scratch_ptr += word_count;
    return ptr;
}


// Resets the pointer to 0. Instantly "frees" all scratch memory.
WASM_EXPORT void scratch_reset() {
    //print("scratch_reset %d", scratch_ptr);
    scratch_ptr = 0;
}


static number global_camera_position[4];
