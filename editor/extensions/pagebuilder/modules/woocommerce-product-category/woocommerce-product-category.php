<?php

/*
* Module Name: Woocommerce product category
* Module URI: http://www.siteeditor.org/modules/woocommerce-product-category
* Description: Woocommerce product category Module For Site Editor Application
* Author: Site Editor Team
* Author URI: http://www.siteeditor.org
* Version: 1.0.0
* @package SiteEditor
* @category Core
* @author siteeditor
*/

if( !is_woocommerce_active() ){
    return ;
}
if( !is_pb_module_active( "woocommerce-archive" )  || !is_pb_module_active( "woocommerce-content-product" ) ){
    sed_admin_notice( __("<b>Woocommerce Product Category module</b> needed to <b>woocommerce archive module</b> and <b>woocommerce content product module</b> <br /> please first install and activate its ") );
    return ;
}

class PBWoocommerceProductCategoryShortcode extends PBShortcodeClass{

    /**
     * Register module with siteeditor.
     */
    function __construct() {
        parent::__construct( array(
                "name"        => "sed_product_category",                               //*require
                "title"       => __("Woo product category","site-editor"),                 //*require for toolbar
                "description" => __("Woocommerce product category","site-editor"),
                "icon"        => "icon-woo",                               //*require for icon toolbar
                "module"      =>  "woocommerce-product-category",         //*require
                //"is_child"    =>  "false"       //for childe shortcodes like sed_tr , sed_td for table module
            ) // Args
        );
        if( !class_exists( 'SedWoocommerceShortcode' ) )
            include_once SED_BASE_PB_APP_PATH . DS . 'modules' . DS . 'woocommerce-archive' . DS . 'includes' . DS . "woocommerce-shortcode.class.php";

        $this->sed_woo_shortcode = new SedWoocommerceShortcode( "product_category" , $this );


    }

    function get_atts(){

        $default_atts = $this->sed_woo_shortcode->default_atts();

        $atts = array(
            'per_page'                      => 12,
            'woo_number_columns'            => 4,
            'orderby'                       => 'title',
            'order'                         => 'asc' ,
			'category'                      => 'clothing',  // Slugs
			'operator'                      => 'IN', // Possible values are 'IN', 'NOT IN', 'AND'.
        );

        return array_merge( $default_atts , $atts);

    }

    function add_shortcode( $atts , $content = null ){

        $this->sed_woo_shortcode->add_shortcode($atts , $content);

        global $woocommerce_loop;

        extract( $atts );

		if ( ! $category ) {
			return __('please select category','site-editor');
		}

		// Default ordering args
		$ordering_args = WC()->query->get_catalog_ordering_args( $orderby, $order );

		$args = array(
			'post_type'				=> 'product',
			'post_status' 			=> 'publish',
			'ignore_sticky_posts'	=> 1,
			'orderby' 				=> $ordering_args['orderby'],
			'order' 				=> $ordering_args['order'],
			'posts_per_page' 		=> $per_page,
			'meta_query' 			=> array(
				array(
					'key' 			=> '_visibility',
					'value' 		=> array('catalog', 'visible'),
					'compare' 		=> 'IN'
				)
			),
			'tax_query' 			=> array(
				array(
					'taxonomy' 		=> 'product_cat',
					'terms' 		=> array_map( 'sanitize_title', explode( ',', $category ) ),
					'field' 		=> 'slug',
					'operator' 		=> $operator
				)
			)
		);

		if ( isset( $ordering_args['meta_key'] ) ) {
			$args['meta_key'] = $ordering_args['meta_key'];
		}

		ob_start();

		$products = new WP_Query( apply_filters( 'woocommerce_shortcode_products_query', $args, $atts ) );

		

        $this->set_vars( array( "products" => $products ) );
    }

    function scripts(){
        return $this->sed_woo_shortcode->scripts();
    }

    function styles(){
        return $this->sed_woo_shortcode->styles();
    }

    function less(){
        return $this->sed_woo_shortcode->less();
    }

    function shortcode_settings(){

        $default_settings = $this->sed_woo_shortcode->shortcode_settings();

        foreach( $this->sed_woo_shortcode->get_panels() As $panel_id => $panel_settings )
            $this->add_panel( $panel_id , $panel_settings );

        $settings = array(
            "category"      => array(
                "type"      => "text",
                "label"     => __("Category","site-editor"),
                "description"  => __('This option allows you to set the categories of your products.',"site-editor"),
                "panel"     => "products_settings_panel",
            ),

            "operator"      => array(
                "type"      => "select",
                "label"     => __("Operator","site-editor"),
                "description"  => __('This option allows you to set how the category groups should be handled. ',"site-editor"),
                "choices"   => array(
                    "IN"            =>__("IN","site-editor"),
                    "NOT IN"        =>__("NOT IN","site-editor"),
                    "AND"           =>__("AND","site-editor"),
                ),
                "panel"     => "products_settings_panel",
            ),
            "orderby"   => array(
                "type"      => "select",
                "label"     => __("order by","site-editor"),
                "description"  => __('This option allows you to set how the products are sorted. The available options are random, date and title.',"site-editor"),
                "choices"   => array(
                    "title"         =>__("Title","site-editor"),
                    "date"          =>__("Date","site-editor"),
                    "rand"          =>__("Random","site-editor"),
                ),
                "panel"     => "products_settings_panel",
            ),

            "order"   => array(
                "type"      => "select",
                "label"     => __("order","site-editor"),
                "description"  => __('This option allows you to set if the list should be sorted ascending or descending.',"site-editor"),
                "choices"   => array(
                    "asc"         =>__("ASC","site-editor"),
                    "desc"        => '',//__("DESC","site-editor")
                ),
                "panel"     => "products_settings_panel",
            ),

            "per_page"    => array(
                "type"      => "number",
                'after_field' => '&emsp;',
                "label"     => __("number","site-editor"),
                "description"  => __('This option allows you to set the maximum number of products to show.',"site-editor"),
                "js_params"  =>  array(
                    "min"  =>  1 ,
                    //"max"  =>  50
                ),
                "panel"     => "products_settings_panel",
                'priority'      => 12 ,
            ),

            "woo_number_columns"    => array(
                "type"      => "number",
                'after_field' => '&emsp;',
                "label"     => __("columns","site-editor"),
                "description"  => __('This option is only available when the type is set to grid or masonry. It is used to set the number of columns.',"site-editor"),
                "js_params"  =>  array(
                    "min"  =>  1 ,
                    //"max"  =>  8
                ),
                "panel"     => "products_settings_panel",
                'priority'      => 13 ,
                "dependency"  => array(
                  'controls'  =>  array(
                    array(
                      "control"  =>  "type" ,
                      "value"    =>  'carousel',
                      "type"     =>  "exclude"
                    ),
                  )
                ),
            ),

        );

        return array_merge( $default_settings , $settings);
    }

    function custom_style_settings(){

        $products_style = SedWoocommerceShortcode::custom_woo_products_style_settings();

        return $products_style;
    }

    function contextmenu( $context_menu ){
      $archive_menu = $context_menu->create_menu( "woo-product-category" , __("Woo Product Category","site-editor") , 'woo-product-category' , 'class' , 'element' , '' , "sed_product_category" , array(
            "seperator"        => array(45 , 75),
            "change_skin"  =>  false ,
            "duplicate"    => false
        ));
      //$context_menu->add_change_column_item( $archive_menu );
    }

}

new PBWoocommerceProductCategoryShortcode();

//include_once dirname( __FILE__ ) . DS . 'includes' . DS . "sub-shortcode.php";

global $sed_pb_app;

$sed_pb_app->register_module(array(
    "group"       => "woocommerce" ,
    "name"        => "woocommerce-product-category",
    "title"       => __("Woo product category","site-editor"),
    "description" => __("Woocommerce product category","site-editor"),
    "icon"        => "icon-woo",
    "type_icon"   => "font",
    "shortcode"   => "sed_product_category",
    "transport"   => "ajax" ,
    //"js_plugin"   => 'image/js/image-plugin.min.js',
    "js_module"   => array( 'sed_woocommerce_archive_module_script', 'woocommerce-archive/js/woo-archive-module.min.js', array('sed-frontend-editor') )
));
